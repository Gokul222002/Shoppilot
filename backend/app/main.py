"""
ShopPilot Backend — Price Comparison API
FastAPI server providing search, trending, and job management endpoints.
ShopPilot is a price comparison service. It does NOT sell products.
There is NO cart and NO checkout in this codebase.
"""

import asyncio
import json
import logging
import math
import re
from datetime import date, timedelta
from typing import Dict, List, Any, Optional
from contextlib import asynccontextmanager
from urllib.parse import quote_plus

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, BackgroundTasks, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.config import settings
from app.mock_store.router import router as mock_store_router
from app.worker.queue import job_manager
from app.notifications.dispatcher import dispatcher

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("ShopPilot.Main")

# ─── WebSocket Connection Manager ───────────────────────────────────────────

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket client connected. Total clients: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"WebSocket client disconnected. Remaining: {len(self.active_connections)}")

    async def broadcast(self, message: Dict[str, Any]):
        for connection in list(self.active_connections):
            try:
                await connection.send_text(json.dumps(message))
            except Exception as e:
                logger.debug(f"Failed to send to client: {e}")
                self.disconnect(connection)

ws_manager = ConnectionManager()

# ─── Lifespan ────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting ShopPilot Backend Server (Price Comparison)...")
    yield
    logger.info("Shutting down ShopPilot Backend Server...")

app = FastAPI(
    title="ShopPilot Price Comparison API",
    description=(
        "ShopPilot is a price comparison and deal-tracking service. "
        "It does NOT sell products, has NO cart, and has NO checkout. "
        "All buy links redirect to the retailer's website."
    ),
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Mock E-Commerce Store Router (for agent testing only)
app.include_router(mock_store_router)

# ─── Mock Product Data (50+ products, 8 categories) ─────────────────────────

STORES = ["Amazon.in", "Flipkart", "Myntra", "Croma", "Tata CLiQ"]


def store_url(store: str, product_name: str) -> str:
    q = quote_plus(product_name)
    urls = {
        "Amazon.in": f"https://www.amazon.in/s?k={q}",
        "Flipkart":  f"https://www.flipkart.com/search?q={q}",
        "Myntra":    f"https://www.myntra.com/{q}",
        "Croma":     f"https://www.croma.com/searchB?q={q}",
        "Tata CLiQ": f"https://www.tatacliq.com/search/?searchCategory=all&text={q}",
    }
    return urls.get(store, f"https://www.amazon.in/s?k={q}")


def gen_offers(name: str, mrp: int, price: int, stores: List[str]) -> List[dict]:
    offers = []
    for idx, store in enumerate(stores):
        variation = 1 + ((idx * 7 + 3) % 10 - 4) * 0.03
        p = round(price * variation)
        m = round(mrp * (1 + (idx % 3) * 0.02))
        offers.append({
            "store": store,
            "price": p,
            "mrp": m,
            "discount_pct": round(((m - p) / m) * 100),
            "in_stock": idx != 3,
            "delivery_days": 1 if idx == 0 else (2 if idx == 1 else 3),
            "seller_rating": round(4.0 + (idx % 5) * 0.15, 1),
            "url": store_url(store, name),
            "last_updated": date.today().isoformat(),
        })
    return offers


def gen_price_history(base_price: int, seed: int) -> List[dict]:
    points = []
    today = date.today()
    price = float(base_price)
    for i in range(364, -1, -1):
        d = today - timedelta(days=i)
        month = d.month
        is_festival = month in (10, 1, 8)  # Diwali, Jan Sale, Independence
        dip = 0.85 if is_festival else 1.0
        noise = (((seed * (i + 1) * 31337) % 1000) / 1000 - 0.5) * 0.08
        price = max(base_price * 0.72, base_price * dip * (1 + noise))
        points.append({"date": d.isoformat(), "price": round(price)})
    return points


# Raw product tuples: (id, name, brand, category, mrp, price, rating, review_count, tags, stores)
RAW_PRODUCTS = [
    # Phones
    ("ph-001","Apple iPhone 15 128GB","Apple","phones",79900,65999,4.6,28400,["5G","iOS","USB-C"],["Amazon.in","Flipkart","Croma"]),
    ("ph-002","Samsung Galaxy S24 5G 128GB","Samsung","phones",79999,64999,4.6,14200,["5G","AI","Snapdragon"],["Flipkart","Amazon.in","Croma"]),
    ("ph-003","OnePlus 12 256GB","OnePlus","phones",64999,56999,4.6,19800,["5G","Hasselblad","100W"],["Amazon.in","Flipkart"]),
    ("ph-004","Redmi Note 13 Pro+ 5G 256GB","Redmi","phones",33999,27999,4.3,44000,["5G","200MP","IP68"],["Amazon.in","Flipkart"]),
    ("ph-005","Realme 12 Pro+ 5G 256GB","Realme","phones",34999,27999,4.4,24000,["5G","Periscope"],["Flipkart","Amazon.in"]),
    ("ph-006","Nothing Phone 2a 5G 128GB","Nothing","phones",25999,21999,4.4,38000,["5G","Glyph"],["Flipkart","Amazon.in"]),
    ("ph-007","Poco X6 Pro 5G 256GB","Poco","phones",30999,23999,4.5,51000,["5G","Gaming"],["Flipkart","Amazon.in"]),
    ("ph-008","iQOO Neo 9 Pro 5G 256GB","iQOO","phones",41999,33999,4.6,21800,["5G","Gaming","144Hz"],["Amazon.in","Flipkart"]),
    # Laptops
    ("lp-001","Apple MacBook Air M3 8GB 256GB","Apple","laptops",114900,104900,4.8,8900,["M3","macOS"],["Amazon.in","Croma"]),
    ("lp-002","HP Victus 15 Intel i5 RTX 3050","HP","laptops",69999,54999,4.4,18000,["Gaming","144Hz"],["Amazon.in","Flipkart"]),
    ("lp-003","Lenovo IdeaPad Slim 3 Intel i5","Lenovo","laptops",52999,41999,4.3,32000,["Thin","Office"],["Flipkart","Amazon.in"]),
    ("lp-004","ASUS ROG Strix G16 RTX 4070","Asus","laptops",199999,174999,4.7,4500,["Gaming","240Hz"],["Amazon.in","Croma"]),
    ("lp-005","Dell Inspiron 15 i5 16GB 512GB","Dell","laptops",61999,49999,4.4,21000,["Thin","Office"],["Amazon.in","Flipkart"]),
    ("lp-006","Acer Nitro V15 RTX 4050","Acer","laptops",71999,56999,4.4,15000,["Gaming","144Hz"],["Amazon.in","Flipkart"]),
    # Earphones
    ("ep-001","Sony WH-1000XM5 Wireless ANC","Sony","earphones",29990,22990,4.7,18200,["ANC","30h","LDAC"],["Amazon.in","Croma","Flipkart"]),
    ("ep-002","Apple AirPods Pro 2nd Gen","Apple","earphones",24900,19900,4.7,34000,["ANC","TWS","iOS"],["Amazon.in","Flipkart","Croma"]),
    ("ep-003","boAt Airdopes 141 TWS","boAt","earphones",2990,999,4.3,182000,["TWS","42h","IPX4"],["Amazon.in","Flipkart","Myntra"]),
    ("ep-004","JBL Tune 770NC Wireless ANC","JBL","earphones",9999,6999,4.5,22000,["ANC","70h","BT5.3"],["Amazon.in","Flipkart"]),
    ("ep-005","Nothing Ear 2 TWS ANC","Nothing","earphones",9999,7499,4.5,32000,["ANC","TWS","LHDC"],["Flipkart","Amazon.in"]),
    # Fans
    ("fn-001","Atomberg Renesa+ 1200mm BLDC","Atomberg","fans",5190,3799,4.6,48000,["BLDC","28W","Smart"],["Amazon.in","Flipkart","Croma"]),
    ("fn-002","Crompton SilentPro Enso BLDC","Crompton","fans",6499,4299,4.6,18200,["BLDC","Silent"],["Flipkart","Amazon.in"]),
    ("fn-003","Havells Stealth Air BLDC","Havells","fans",7850,5499,4.7,6200,["BLDC","Quiet"],["Tata CLiQ","Amazon.in"]),
    ("fn-004","Bajaj Maxima 600mm Ceiling Fan","Bajaj","fans",2290,1599,4.3,31000,["High Speed","870RPM"],["Amazon.in","Flipkart"]),
    ("fn-005","Orient Electric Wendy 1200mm","Orient Electric","fans",4450,3199,4.5,12800,["Metallic","Copper"],["Flipkart","Amazon.in"]),
    # Speakers
    ("sp-001","JBL Flip 6 Portable Speaker IP67","JBL","speakers",13999,9999,4.7,34000,["Portable","IP67","12h"],["Amazon.in","Flipkart","Croma"]),
    ("sp-002","boAt Stone 650 10W IPX5","boAt","speakers",3990,1499,4.5,78000,["10W","IPX5"],["Flipkart","Amazon.in","Myntra"]),
    ("sp-003","Marshall Emberton II IP67","Marshall","speakers",17499,14999,4.8,12400,["IP67","30h","360°"],["Amazon.in","Croma"]),
    ("sp-004","Sony SRS-XB100 Extra Bass","Sony","speakers",4990,3990,4.6,14200,["Extra Bass","IP67"],["Croma","Amazon.in","Flipkart"]),
    ("sp-005","Echo Dot 5th Gen Alexa","Amazon","speakers",5499,4499,4.5,62000,["Smart Home","Alexa"],["Amazon.in","Flipkart"]),
    # Keyboards
    ("kb-001","Logitech MX Keys S Wireless","Logitech","keyboards",9995,7495,4.7,14200,["Wireless","Backlit","Multi-Device"],["Amazon.in","Croma","Flipkart"]),
    ("kb-002","Keychron K2 V2 Hot-Swap Wireless","Keychron","keyboards",7999,6999,4.7,8400,["Hot-Swap","Wireless"],["Amazon.in","Flipkart"]),
    ("kb-003","Razer Huntsman Mini 60% Optical","Razer","keyboards",10999,8499,4.5,11000,["60%","Optical","RGB"],["Amazon.in","Flipkart"]),
    ("kb-004","Cosmic Byte Neon Mechanical RGB","Cosmic Byte","keyboards",3999,2499,4.3,26000,["Mechanical","RGB","Gaming"],["Amazon.in","Flipkart"]),
    # Mice
    ("ms-001","Logitech MX Master 3S Wireless","Logitech","mice",9995,7495,4.8,28400,["Wireless","8000 DPI","Silent"],["Amazon.in","Croma","Flipkart"]),
    ("ms-002","Razer DeathAdder Essential","Razer","mice",2499,1199,4.6,54000,["Gaming","6400 DPI"],["Amazon.in","Flipkart"]),
    ("ms-003","boAt Immortal 121 RGB 7200 DPI","boAt","mice",1490,699,4.4,18900,["Gaming","RGB"],["Flipkart","Amazon.in","Myntra"]),
    ("ms-004","Logitech M221 Silent Wireless","Logitech","mice",1195,799,4.7,48000,["Silent","Wireless"],["Amazon.in","Flipkart"]),
    # Kitchen
    ("kt-001","Philips Mixer Grinder 500W 3 Jars","Philips","kitchen",4999,2999,4.4,42000,["500W","3 Jars"],["Amazon.in","Flipkart","Croma"]),
    ("kt-002","Prestige Pressure Cooker 3L SS","Prestige","kitchen",2990,1699,4.5,34000,["Stainless Steel","3L"],["Amazon.in","Flipkart"]),
    ("kt-003","Borosil Glass Mixing Bowl Set 3Pcs","Borosil","kitchen",1190,799,4.6,28400,["Borosilicate","Microwave Safe"],["Amazon.in","Flipkart","Myntra"]),
    ("kt-004","Milton Thermosteel Flask 1L","Milton","kitchen",1290,699,4.5,54000,["Hot & Cold","18h","SS 304"],["Amazon.in","Flipkart","Myntra"]),
    ("kt-005","Bajaj Majesty Induction Cooktop","Bajaj","kitchen",2990,1799,4.4,32000,["1200W","Auto-off"],["Amazon.in","Flipkart","Croma"]),
    ("kt-006","Philips Air Fryer 4.1L","Philips","kitchen",11999,7499,4.5,18000,["4.1L","1400W"],["Amazon.in","Flipkart","Croma"]),
]

# Build the full product catalog
PRODUCTS: List[dict] = []
for idx, row in enumerate(RAW_PRODUCTS):
    pid, name, brand, category, mrp, price, rating, review_count, tags, stores = row
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    PRODUCTS.append({
        "id": pid,
        "name": name,
        "brand": brand,
        "category": category,
        "slug": slug,
        "rating": rating,
        "review_count": review_count,
        "tags": tags,
        "best_price": price,
        "mrp": mrp,
        "best_discount_pct": round(((mrp - price) / mrp) * 100),
        "offers": gen_offers(name, mrp, price, stores),
        "price_history": gen_price_history(price, idx * 17 + 3),
        "image_url": f"https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500&auto=format&fit=crop&q=60",
    })


# ─── Request / Response Schemas ───────────────────────────────────────────────

class CreateJobRequest(BaseModel):
    objective: str
    start_url: Optional[str] = None

class WebhookTestPayload(BaseModel):
    id: Optional[str] = None
    event_type: Optional[str] = None
    title: Optional[str] = None
    message: Optional[str] = None
    data: Optional[Dict[str, Any]] = None

received_webhooks: List[Dict[str, Any]] = []

# ─── Existing Endpoints ───────────────────────────────────────────────────────

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "app": "ShopPilot Price Comparison API",
        "vision_model": settings.VISION_MODEL_NAME,
        "gemini_active": bool(settings.GEMINI_API_KEY),
        "product_count": len(PRODUCTS),
        "note": "ShopPilot compares prices only. No cart. No checkout.",
    }

@app.post("/api/jobs")
async def create_job(payload: CreateJobRequest, background_tasks: BackgroundTasks):
    """Launch an autonomous browser price-scouting mission."""
    if not payload.objective.strip():
        raise HTTPException(status_code=400, detail="Objective cannot be empty.")

    start_url = payload.start_url or f"http://127.0.0.1:{settings.PORT}/mock-store"
    job_id = job_manager.create_job(objective=payload.objective, start_url=start_url)

    background_tasks.add_task(
        job_manager.execute_job_async,
        job_id=job_id,
        ws_callback=ws_manager.broadcast
    )

    return {
        "job_id": job_id,
        "status": "QUEUED",
        "objective": payload.objective,
        "start_url": start_url
    }

@app.get("/api/jobs")
async def list_jobs():
    return {"jobs": job_manager.list_jobs()}

@app.get("/api/jobs/{job_id}")
async def get_job_status(job_id: str):
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

@app.get("/api/notifications")
async def get_notifications():
    return {"notifications": [n.model_dump() for n in dispatcher.notification_history]}

@app.post("/api/webhook/mock")
async def mock_webhook_receiver(payload: Dict[str, Any]):
    """Receives and stores dispatched price alerts for testing webhook pipelines."""
    logger.info(f"Received webhook: {payload.get('event_type')} - {payload.get('title')}")
    received_webhooks.append(payload)
    return {"received": True, "count": len(received_webhooks)}

@app.get("/api/webhook/logs")
async def get_webhook_logs():
    return {"webhooks": received_webhooks}

# ─── New Price Comparison Endpoints ──────────────────────────────────────────

@app.get("/api/search")
async def search_products(
    q: str = Query(default="", description="Search query"),
    category: str = Query(default="", description="Filter by category"),
    min_price: Optional[int] = Query(default=None, description="Minimum price (INR)"),
    max_price: Optional[int] = Query(default=None, description="Maximum price (INR)"),
    store: str = Query(default="", description="Filter by store name"),
    sort_by: str = Query(default="", description="Sort: price_asc | price_desc | rating | discount"),
    limit: int = Query(default=40, le=100, description="Max results"),
):
    """
    Search products for price comparison.
    Returns matching products with offers from multiple stores.
    Users click through to the store to complete their purchase.
    """
    q_lower = q.lower().strip()
    results = []

    for p in PRODUCTS:
        # Text match
        if q_lower:
            if not any([
                q_lower in p["name"].lower(),
                q_lower in p["brand"].lower(),
                q_lower in p["category"].lower(),
                any(q_lower in t.lower() for t in p["tags"]),
            ]):
                continue
        # Category filter
        if category and p["category"] != category:
            continue
        # Price range
        bp = p["best_price"]
        if min_price is not None and bp < min_price:
            continue
        if max_price is not None and bp > max_price:
            continue
        # Store filter
        if store and not any(o["store"] == store for o in p["offers"]):
            continue
        results.append(p)

    # Sort
    if sort_by == "price_asc":
        results.sort(key=lambda x: x["best_price"])
    elif sort_by == "price_desc":
        results.sort(key=lambda x: x["best_price"], reverse=True)
    elif sort_by == "rating":
        results.sort(key=lambda x: x["rating"], reverse=True)
    elif sort_by == "discount":
        results.sort(key=lambda x: x["best_discount_pct"], reverse=True)

    return {
        "query": q,
        "total": len(results),
        "results": results[:limit],
    }


@app.get("/api/products/trending")
async def get_trending(
    limit: int = Query(default=20, le=50, description="Number of trending products"),
):
    """Return top trending products sorted by review count (popularity proxy)."""
    sorted_products = sorted(PRODUCTS, key=lambda x: x["review_count"], reverse=True)
    return {
        "total": len(sorted_products),
        "results": sorted_products[:limit],
        "note": "Sorted by review count as popularity proxy. Prices from multiple stores — users buy on the retailer's site.",
    }


@app.get("/api/products/{product_id}")
async def get_product(product_id: str):
    """Get a single product with all store offers and price history."""
    product = next((p for p in PRODUCTS if p["id"] == product_id), None)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


# ─── Price-Drop Alerts System ─────────────────────────────────────────────────

class CreateAlertRequest(BaseModel):
    product_id: str
    product_name: str
    email: str
    target_price: int
    current_price: Optional[int] = None

price_alerts: List[Dict[str, Any]] = []

@app.post("/api/alerts")
async def create_price_alert(payload: CreateAlertRequest):
    """Register a user email for price drop alerts on a product."""
    alert_id = f"alt-{len(price_alerts) + 1:04d}"
    alert_record = {
        "id": alert_id,
        "product_id": payload.product_id,
        "product_name": payload.product_name,
        "email": payload.email,
        "target_price": payload.target_price,
        "current_price": payload.current_price,
        "created_at": date.today().isoformat(),
        "status": "ACTIVE",
    }
    # Update if already exists for same email & product
    existing = next((a for a in price_alerts if a["email"] == payload.email and a["product_id"] == payload.product_id), None)
    if existing:
        existing.update({
            "target_price": payload.target_price,
            "current_price": payload.current_price,
        })
        logger.info(f"Updated price alert for {payload.email} on {payload.product_name}")
        return {"status": "UPDATED", "alert": existing}
    
    price_alerts.append(alert_record)
    logger.info(f"Created price alert {alert_id} for {payload.email} on {payload.product_name} at target ₹{payload.target_price}")
    return {"status": "CREATED", "alert": alert_record}


@app.get("/api/alerts")
async def list_price_alerts(email: Optional[str] = None):
    """List active price drop alerts, optionally filtered by user email."""
    if email:
        return {"alerts": [a for a in price_alerts if a["email"] == email]}
    return {"alerts": price_alerts, "total": len(price_alerts)}


@app.delete("/api/alerts/{alert_id}")
async def delete_price_alert(alert_id: str):
    """Unsubscribe or delete a price drop alert."""
    global price_alerts
    initial_len = len(price_alerts)
    price_alerts = [a for a in price_alerts if a["id"] != alert_id]
    if len(price_alerts) == initial_len:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"status": "DELETED", "alert_id": alert_id}


@app.post("/api/alerts/check")
async def check_price_alerts():
    """
    Background simulation worker: Checks all active alerts against latest product prices.
    Dispatches mock notification / console-log email for any alerts where current_price <= target_price.
    """
    triggered = []
    for alert in price_alerts:
        prod = next((p for p in PRODUCTS if p["id"] == alert["product_id"]), None)
        if prod:
            current_lowest = prod["best_price"]
            if current_lowest <= alert["target_price"]:
                alert["status"] = "TRIGGERED"
                alert["triggered_at"] = date.today().isoformat()
                logger.info(
                    f"[EMAIL DISPATCHED] To: {alert['email']} | Subject: Price Drop Alert: {alert['product_name']} "
                    f"is now ₹{current_lowest} (Your target was ₹{alert['target_price']})!"
                )
                triggered.append({
                    "alert_id": alert["id"],
                    "email": alert["email"],
                    "product": alert["product_name"],
                    "target_price": alert["target_price"],
                    "current_price": current_lowest,
                })
    return {
        "status": "CHECK_COMPLETE",
        "total_evaluated": len(price_alerts),
        "triggered_count": len(triggered),
        "triggered_alerts": triggered,
    }



# ─── WebSocket Endpoint ───────────────────────────────────────────────────────

@app.websocket("/ws/agent")
async def websocket_agent_endpoint(websocket: WebSocket):
    """Real-time streaming channel for price scouting mission updates."""
    await ws_manager.connect(websocket)
    try:
        await websocket.send_text(json.dumps({
            "type": "CONNECTION_ESTABLISHED",
            "message": "Connected to ShopPilot Price Comparison Stream",
            "active_jobs": len(job_manager.list_jobs())
        }))

        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                action = msg.get("action")
                if action == "START_MISSION":
                    objective = msg.get("objective", "Find best price for OnePlus 12")
                    start_url = msg.get("start_url") or f"http://127.0.0.1:{settings.PORT}/mock-store"
                    job_id = job_manager.create_job(objective=objective, start_url=start_url)
                    asyncio.create_task(
                        job_manager.execute_job_async(job_id=job_id, ws_callback=ws_manager.broadcast)
                    )
                    await websocket.send_text(json.dumps({
                        "type": "MISSION_STARTED",
                        "job_id": job_id
                    }))
                elif action == "PING":
                    await websocket.send_text(json.dumps({"type": "PONG"}))
            except Exception as e:
                logger.error(f"Error handling websocket message: {e}")

    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket unexpected error: {e}")
        ws_manager.disconnect(websocket)
