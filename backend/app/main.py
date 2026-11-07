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
import os
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
from app.search_engine import search_catalog_fuzzy

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
frontend_env = os.getenv("FRONTEND_URL", "").strip()
allowed_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://shoppilot-frontend-fo5e.onrender.com",
]
if frontend_env:
    allowed_origins.append(frontend_env)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins if frontend_env else ["*"],
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


# ─── Product Catalog Data (300+ products, 8 categories) ───────────────────────

CATALOG_FILE = os.path.join(os.path.dirname(__file__), "data", "catalog.json")
PRODUCTS: List[dict] = []

if os.path.exists(CATALOG_FILE):
    with open(CATALOG_FILE, "r", encoding="utf-8") as f:
        loaded = json.load(f)
        for p in loaded:
            bp = min(o["price"] for o in p["offers"])
            mp = max(o["mrp"] for o in p["offers"])
            pct = round(((mp - bp) / mp) * 100) if mp > 0 else 0
            p["best_price"] = bp
            p["mrp"] = mp
            p["best_discount_pct"] = pct
            p["price_history"] = p.get("priceHistory", [])
            p["image_url"] = p.get("imageUrl", "")
            p["review_count"] = p.get("reviewCount", 0)
            PRODUCTS.append(p)
else:
    logger.warning(f"Catalog file not found at {CATALOG_FILE}")

# Map legacy IDs for backwards compatibility in existing tests
LEGACY_MAP = {
    "ph-001": "Apple iPhone 15 (Black, 128GB)",
    "ph-002": "Samsung Galaxy S24 5G (Onyx Black, 128GB)",
    "ph-003": "OnePlus 12",
    "lp-001": "Apple MacBook Air",
}
for leg_id, query_str in LEGACY_MAP.items():
    match = next((p for p in PRODUCTS if query_str.lower() in p["name"].lower()), None)
    if match and "legacy_id" not in match:
        match["legacy_id"] = leg_id


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
    Search products for price comparison with typo tolerance.
    Returns matching products with offers from multiple stores.
    Users click through to the store to complete their purchase.
    """
    results = search_catalog_fuzzy(
        catalog=PRODUCTS,
        query=q,
        category=category if category else None,
        min_price=min_price,
        max_price=max_price,
        store=store if store else None,
        sort_by=sort_by if sort_by else None,
    )

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
    product = next((p for p in PRODUCTS if p["id"] == product_id or p.get("legacy_id") == product_id), None)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if product.get("legacy_id") == product_id:
        p_copy = dict(product)
        p_copy["id"] = product_id
        return p_copy
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
        prod = next((p for p in PRODUCTS if p["id"] == alert["product_id"] or p.get("legacy_id") == alert["product_id"]), None)
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


# ─── AI Shopping Assistant Endpoint ──────────────────────────────────────────

class AssistantQueryRequest(BaseModel):
    query: str

@app.post("/api/assistant")
async def ai_shopping_assistant(payload: AssistantQueryRequest):
    """
    AI Shopping Advisor: Analyzes query using Gemini API (with heuristic catalog fallback)
    and returns expert advice along with matching catalog products.
    """
    from app.agent.assistant import extract_budget, ask_gemini, generate_heuristic_advice

    q = payload.query.strip()
    if not q:
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    budget = extract_budget(q)
    tokens = [t.lower() for t in re.sub(r"[^\w\s]", " ", q).split() if len(t) > 2]

    # Filter matching products from catalog
    matching = []
    for p in PRODUCTS:
        name_lower = p["name"].lower()
        cat_lower = p["category"].lower()
        brand_lower = p["brand"].lower()
        tags_lower = [t.lower() for t in p.get("tags", [])]

        matches = any(tok in name_lower or tok in cat_lower or tok in brand_lower or any(tok in tg for tg in tags_lower) for tok in tokens)
        if matches:
            if budget and p["best_price"] > budget * 1.25:
                continue
            matching.append(p)

    # Sort matching by rating & reviews
    matching.sort(key=lambda x: (x["rating"], x["review_count"]), reverse=True)
    top_matches = matching[:4] if matching else PRODUCTS[:3]

    # Try Gemini API first if configured
    gemini_prompt = (
        f"You are the ShopPilot AI Shopping Advisor. The user asked: \"{q}\".\n"
        f"Available verified store products:\n" +
        "\n".join([f"- {p['name']}: ₹{p['best_price']} (MRP ₹{p['mrp']}) on {p['offers'][0]['store'] if p['offers'] else 'Amazon'}, Rating {p['rating']}★" for p in top_matches]) +
        "\nProvide concise, helpful shopping advice in 2-3 brief paragraphs. Emphasize value, key specs, and where to buy at the lowest price. Never mention carts or checkouts, as ShopPilot is a price comparison engine."
    )

    gemini_resp = await ask_gemini(gemini_prompt)
    if gemini_resp:
        response_text = gemini_resp
        model_used = settings.VISION_MODEL_NAME
    else:
        response_text = generate_heuristic_advice(q, top_matches, budget)
        model_used = "ShopPilot Catalog AI Heuristic"

    return {
        "query": q,
        "response": response_text,
        "budget": budget,
        "model": model_used,
        "products": top_matches,
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
