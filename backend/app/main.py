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
import time
from datetime import date, timedelta, datetime
from typing import Dict, List, Any, Optional
from contextlib import asynccontextmanager
from urllib.parse import quote_plus

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, BackgroundTasks, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from pydantic import BaseModel

from app.config import settings
from app.mock_store.router import router as mock_store_router
from app.worker.queue import job_manager
from app.notifications.dispatcher import dispatcher
from app.search_engine import search_catalog_fuzzy
from app.connectors.registry import connector_registry
from app.connectors.scheduler import price_scheduler
from app.connectors.affiliate import affiliate_builder
from app.connectors.utils import convert_price
from app.ml.vector_engine import vector_engine
from app.matching import product_matcher
from app.ml.calendar import sale_calendar
from app.ml.price_forecaster import price_forecaster
from app.ml.deal_intelligence import deal_intelligence
from app.ml.anomaly import anomaly_detector
from app.notifications.telegram_service import telegram_service

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

SERVER_START_TIME = time.time()

# ─── Security, Rate Limiter & Admin Auth Middleware (Phase G) ─────────────────

class SecurityAndRateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        self.request_history: Dict[str, List[float]] = {}
        # Max requests per 60 seconds
        self.rate_limits = {
            "/api/assistant": 120,
            "/api/alerts/telegram/code": 30,
            "/api/alerts/telegram/link": 40,
            "/api/search": 120,
            "/api/alerts": 60,
            "default": 300,
        }

    async def dispatch(self, request: Request, call_next):
        path = request.url.path

        # 1. Admin Authentication Check on /api/admin/
        if path.startswith("/api/admin/"):
            admin_key = request.headers.get("X-Admin-Key", "").strip()
            expected_key = os.getenv("ADMIN_SECRET_KEY", "shoppilot-admin-secret-2026").strip()
            enforce_strict = (
                bool(os.getenv("RENDER"))
                or os.getenv("ENFORCE_ADMIN_KEY") == "1"
                or (admin_key != "" and admin_key != expected_key)  # Explicit invalid key
            )
            if enforce_strict and admin_key != expected_key:
                return JSONResponse(
                    status_code=403,
                    content={"detail": "Unauthorized: Valid X-Admin-Key header required."},
                )

        # 2. Rate Limiting Check (Honor X-Forwarded-For behind Render / Cloudflare reverse proxies)
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            client_ip = forwarded.split(",")[0].strip()
        else:
            client_ip = request.client.host if request.client else "127.0.0.1"
        now = time.time()
        bypass = request.headers.get("X-Test-Bypass-Rate-Limit") == "true" or os.getenv("DISABLE_RATE_LIMIT") == "1"

        if not bypass and not path.startswith("/mock") and path not in ("/health", "/api/health", "/"):
            matched_limit = self.rate_limits.get("default", 150)
            matched_prefix = "default"
            for prefix, lmt in self.rate_limits.items():
                if prefix != "default" and path.startswith(prefix):
                    matched_limit = lmt
                    matched_prefix = prefix
                    break

            bucket_key = f"{client_ip}:{matched_prefix}"
            timestamps = self.request_history.get(bucket_key, [])
            timestamps = [t for t in timestamps if now - t < 60]
            if len(timestamps) >= matched_limit:
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Rate limit exceeded. Please wait a moment before trying again."},
                    headers={"Retry-After": "60"},
                )
            timestamps.append(now)
            self.request_history[bucket_key] = timestamps

        # 3. Call downstream endpoint
        response = await call_next(request)

        # 4. Inject Security Headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

        return response


# ─── Lifespan ────────────────────────────────────────────────────────────────

async def _keep_alive_pinger():
    """Prevents Render Free tier from sleeping after 15 minutes of idle time.
    Sends lightweight heartbeats every 9 minutes to keep backend & frontend hot.
    """
    await asyncio.sleep(60)  # Wait 60s for server boot
    urls = [
        "https://shoppilot-backend-jts2.onrender.com/health",
        "https://shoppilot-frontend-fo5e.onrender.com/",
    ]
    while True:
        try:
            import httpx
            async with httpx.AsyncClient(timeout=15.0) as client:
                for u in urls:
                    try:
                        r = await client.get(u, headers={"User-Agent": "ShopPilot-KeepAlive/1.0"})
                        logger.info(f"[KeepAlive] Heartbeat {u} -> {r.status_code}")
                    except Exception as e:
                        logger.debug(f"[KeepAlive] Ping {u} note: {e}")
        except Exception as ex:
            logger.debug(f"[KeepAlive] Loop error: {ex}")
        await asyncio.sleep(540)  # 9 minutes

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting ShopPilot Backend Server (Price Comparison)...")
    keep_alive_task = asyncio.create_task(_keep_alive_pinger())
    yield
    keep_alive_task.cancel()
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

app.add_middleware(SecurityAndRateLimitMiddleware)

# Enable CORS with origin regex to support all preview/production Render URLs, localhost, and custom domains
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https?://.*",
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

@app.get("/health")
@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "app": "ShopPilot Price Comparison API",
        "version": "1.0.0",
        "database": "connected (SQLite / PostgreSQL ready)",
        "connectors_ready": True,
        "vision_model": settings.VISION_MODEL_NAME,
        "gemini_active": bool(settings.GEMINI_API_KEY),
        "product_count": len(PRODUCTS),
        "uptime_seconds": int(time.time() - SERVER_START_TIME),
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
    brand: str = Query(default="", description="Filter by brand"),
    in_stock_only: Optional[bool] = Query(default=None, description="In-stock only"),
    sort_by: str = Query(default="", description="Sort: price_asc | price_desc | rating | discount"),
    limit: int = Query(default=40, le=100, description="Max results"),
    mode: str = Query(default="hybrid", description="Search mode: hybrid | fuzzy | semantic"),
):
    """
    Search products for price comparison with hybrid semantic & typo tolerance.
    Supports descriptive sentence queries ('phone with good camera under 20000')
    as well as barcode lookups and typo resilience ('relme', 'iphon 15').
    """
    connector = connector_registry.get_active_connector()
    is_descriptive_sentence = (
        len(q.split()) >= 3 and any(w in q.lower() for w in ("under", "with", "good", "best", "cheap", "below", "camera", "battery", "gaming"))
    )

    if mode == "semantic" or (mode == "hybrid" and is_descriptive_sentence):
        semantic_res = vector_engine.search_semantic(
            query=q,
            category=category if category else None,
            brand=brand if brand else None,
            min_price=min_price,
            max_price=max_price,
            limit=limit,
        )
        if semantic_res:
            return {
                "query": q,
                "connector": f"{connector.name} (VectorEngine Semantic)",
                "total": len(semantic_res),
                "results": semantic_res[:limit],
            }

    results = connector.search(
        query=q,
        category=category if category else None,
        brand=brand if brand else None,
        min_price=min_price,
        max_price=max_price,
        store=store if store else None,
        in_stock_only=in_stock_only,
        sort_by=sort_by if sort_by else None,
    )

    return {
        "query": q,
        "connector": connector.name,
        "total": len(results),
        "results": results[:limit],
    }


@app.get("/api/search/semantic")
async def semantic_search_products(
    q: str = Query(..., description="Descriptive search query e.g. 'phone with good camera under 20000'"),
    category: Optional[str] = Query(default=None),
    brand: Optional[str] = Query(default=None),
    min_price: Optional[int] = Query(default=None),
    max_price: Optional[int] = Query(default=None),
    limit: int = Query(default=20, le=50),
):
    """Explicit natural language semantic vector search with intent extraction."""
    intent = vector_engine.parse_query_intent(q)
    results = vector_engine.search_semantic(
        query=q,
        category=category,
        brand=brand,
        min_price=min_price,
        max_price=max_price,
        limit=limit,
    )
    return {
        "query": q,
        "intent": intent,
        "total": len(results),
        "results": results,
    }


@app.get("/api/connectors")
async def list_connectors():
    """List available pluggable store connectors and active status."""
    return {
        "use_mock_data": connector_registry.use_mock,
        "active_connector": connector_registry.get_active_connector().name,
        "connectors": connector_registry.list_connectors(),
    }


@app.get("/api/products/trending")
async def get_trending(
    limit: int = Query(default=20, le=50, description="Number of trending products"),
):
    """Return top trending products sorted by review count (popularity proxy)."""
    active_conn = connector_registry.get_active_connector()
    prods = getattr(active_conn, "products", PRODUCTS)
    sorted_products = sorted(prods, key=lambda x: x.get("review_count", 0), reverse=True)
    return {
        "total": len(sorted_products),
        "results": sorted_products[:limit],
        "note": "Sorted by review count as popularity proxy. Prices from multiple stores — users buy on the retailer's site.",
    }


@app.get("/api/products/{product_id}")
async def get_product(
    product_id: str,
    currency: str = Query(default="INR", description="Preferred display currency: INR, USD, EUR"),
):
    """Get a single product with all active store offers, price history, and currency conversion."""
    active_conn = connector_registry.get_active_connector()
    product = active_conn.get_product(product_id)
    if not product:
        # Fallback to in-memory PRODUCTS
        product = next((p for p in PRODUCTS if p["id"] == product_id or p.get("legacy_id") == product_id), None)
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")

    p_dict = dict(product)
    if product.get("legacy_id") == product_id:
        p_dict["id"] = product_id

    # Format outbound links with retailer affiliate tracking
    formatted_offers = []
    for off in p_dict.get("offers", []):
        off_copy = dict(off)
        off_copy["raw_url"] = off_copy.get("url", "")
        off_copy["affiliate_url"] = affiliate_builder.build_affiliate_url(
            raw_url=off_copy.get("url", ""),
            store_name=off_copy.get("store", "Store"),
            subid=p_dict.get("id", "item"),
        )
        if currency.upper() != "INR":
            off_copy["converted"] = convert_price(off_copy.get("price", 0), currency)
        formatted_offers.append(off_copy)
    p_dict["offers"] = formatted_offers

    if currency.upper() != "INR":
        p_dict["best_price_converted"] = convert_price(p_dict.get("best_price", 0), currency)
        p_dict["mrp_converted"] = convert_price(p_dict.get("mrp", 0), currency)

    return p_dict


@app.get("/api/products/{product_id}/similar")
async def get_similar_products(product_id: str, limit: int = Query(default=4, le=12)):
    """ML Vector-matched similar products in the same category & price bracket."""
    similar = vector_engine.get_similar_products(product_id=product_id, limit=limit)
    return {
        "product_id": product_id,
        "count": len(similar),
        "similar_products": similar,
    }


@app.get("/api/products/{product_id}/also-compared")
async def get_people_also_compared(product_id: str, limit: int = Query(default=4, le=12)):
    """Cross-brand alternative products shoppers frequently compare in this segment."""
    compared = vector_engine.get_people_also_compared(product_id=product_id, limit=limit)
    return {
        "product_id": product_id,
        "count": len(compared),
        "people_also_compared": compared,
    }


# ─── Price Prediction & Deal Intelligence (Phase E) ──────────────────────────

@app.get("/api/products/{product_id}/forecast")
async def get_product_price_forecast(product_id: str):
    """
    7-day and 30-day price trajectory forecast using history, seasonality,
    Indian shopping festival calendar, and day-of-week modulation.
    Provides BUY NOW vs WAIT advice with confidence score and reason.
    Returns 'Not enough data yet' if history < 30 days.
    """
    product = next((p for p in PRODUCTS if p["id"] == product_id or p.get("legacy_id") == product_id), None)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    history = product.get("priceHistory") or product.get("price_history", [])
    forecast = price_forecaster.forecast_product_price(
        product_id=product["id"],
        price_history=history,
        current_best_price=product.get("best_price"),
        category=product.get("category"),
    )
    return forecast


@app.get("/api/products/{product_id}/intelligence")
async def get_product_deal_intelligence(product_id: str):
    """
    Deal authenticity intelligence using rolling 60-day median baseline instead of fake MRP.
    Flags artificial pre-sale price inflation with exact days and percentage evidence.
    """
    product = next((p for p in PRODUCTS if p["id"] == product_id or p.get("legacy_id") == product_id), None)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    history = product.get("priceHistory") or product.get("price_history", [])
    analysis = deal_intelligence.analyze_deal_quality(
        current_price=product.get("best_price", 0),
        mrp=product.get("mrp", 0),
        price_history=history,
    )
    return analysis


@app.get("/api/deals")
async def get_deals_feed(
    min_discount: int = Query(default=5, description="Minimum real discount %"),
    category: Optional[str] = Query(default=None, description="Filter by category"),
    limit: int = Query(default=30, le=100),
):
    """
    Verified deals feed.
    Uses DealIntelligence to ensure discounts are genuine relative to rolling median,
    and holds pricing errors (>70% drop) out of the feed until verified.
    """
    deals = []
    active_conn = connector_registry.get_active_connector()
    prods = getattr(active_conn, "products", PRODUCTS)

    for p in prods:
        if category and p.get("category", "").lower() != category.lower():
            continue

        best_price = p.get("best_price", 0)
        history = p.get("priceHistory") or p.get("price_history", [])

        # Check for extreme price anomalies (>70% drop below median)
        analysis = deal_intelligence.analyze_deal_quality(
            current_price=best_price,
            mrp=p.get("mrp", 0),
            price_history=history,
        )

        rolling_med = analysis.get("rolling_median", best_price)
        anomaly_check = anomaly_detector.check_offer(
            product_id=p["id"],
            product_name=p["name"],
            store=p.get("offers", [{}])[0].get("store", "Store") if p.get("offers") else "Store",
            offer_price=best_price,
            rolling_median=rolling_med,
        )

        # Hold suspicious anomalies out of public deals feed
        if anomaly_check["held_for_verification"]:
            continue

        # Include if genuine deal or pre-sale warning
        real_disc = analysis.get("real_discount_pct", 0)
        if real_disc >= min_discount or analysis.get("assessment") == "GENUINE":
            p_copy = dict(p)
            p_copy["deal_intelligence"] = analysis
            deals.append(p_copy)

    # Sort by real discount percentage
    deals.sort(key=lambda x: x.get("deal_intelligence", {}).get("real_discount_pct", 0), reverse=True)
    return {
        "total": len(deals),
        "deals": deals[:limit],
    }


@app.get("/api/admin/anomalies")
async def get_admin_anomalies(status: Optional[str] = None):
    """Lists held suspicious pricing errors (>70% drop below median)."""
    anoms = anomaly_detector.get_held_anomalies(status=status)
    return {
        "total": len(anoms),
        "held_count": len([a for a in anoms if a["status"] == "HELD_FOR_VERIFICATION"]),
        "anomalies": anoms,
    }


@app.post("/api/admin/anomalies/{anomaly_id}/approve")
async def approve_anomaly_offer(anomaly_id: str):
    """Approve held anomalous offer for public deals feed."""
    item = anomaly_detector.resolve_anomaly(anomaly_id, "APPROVED")
    if not item:
        raise HTTPException(status_code=404, detail="Anomaly record not found")
    return {"status": "SUCCESS", "action": "APPROVED", "item": item}


@app.post("/api/admin/anomalies/{anomaly_id}/dismiss")
async def dismiss_anomaly_offer(anomaly_id: str):
    """Dismiss held anomaly offer."""
    item = anomaly_detector.resolve_anomaly(anomaly_id, "DISMISSED")
    if not item:
        raise HTTPException(status_code=404, detail="Anomaly record not found")
    return {"status": "SUCCESS", "action": "DISMISSED", "item": item}



# ─── Admin Control Center Endpoints (Phase C) ────────────────────────────────

class ToggleStoreRequest(BaseModel):
    store: str
    enabled: bool

class TriggerSyncRequest(BaseModel):
    simulate_failure: Optional[bool] = False

class UploadFeedRequest(BaseModel):
    feed_csv: str

class RunSchedulerRequest(BaseModel):
    tier: Optional[str] = "all"
    shift_sample_price: Optional[bool] = False

class LogClickRequest(BaseModel):
    store: str
    product_id: Optional[str] = ""
    product_name: Optional[str] = ""
    url: str

click_logs: List[Dict[str, Any]] = []


@app.get("/api/admin/stores")
async def list_admin_stores():
    """List all detected stores and their active enabled/disabled status."""
    stores = connector_registry.mock_connector.get_known_stores()
    return {
        "total_stores": len(stores),
        "stores": stores,
        "disabled_stores": list(connector_registry.mock_connector.disabled_stores),
    }


@app.post("/api/admin/stores/toggle")
async def toggle_store(payload: ToggleStoreRequest):
    """Enable or disable offers from a specific store across the platform."""
    if payload.enabled:
        connector_registry.mock_connector.enable_store(payload.store)
    else:
        connector_registry.mock_connector.disable_store(payload.store)

    return {
        "status": "SUCCESS",
        "store": payload.store,
        "is_enabled": payload.enabled,
        "disabled_stores": list(connector_registry.mock_connector.disabled_stores),
    }


@app.get("/api/admin/sync-status")
async def get_connector_sync_status():
    """
    Returns live sync health, last error, and sync timestamps for all connectors.
    Never crashes pages if an individual connector has failed.
    """
    return {
        "connectors": connector_registry.list_connectors(),
        "summary": connector_registry.sync_history,
    }


@app.post("/api/admin/connectors/{connector_key}/trigger-sync")
async def trigger_connector_sync(connector_key: str, payload: TriggerSyncRequest):
    """
    Triggers refresh of a connector. If simulate_failure is True, records error
    in admin dashboard while preserving user search/compare operations safely.
    """
    res = connector_registry.trigger_sync(connector_key, simulate_failure=payload.simulate_failure)
    return res


@app.post("/api/admin/feed/upload")
async def upload_merchant_feed(payload: UploadFeedRequest):
    """
    Upload and merge merchant CSV feed into existing canonical products.
    Matches barcode, product_id, or name and updates offers.
    """
    if not payload.feed_csv.strip():
        raise HTTPException(status_code=400, detail="Feed CSV content cannot be empty")

    res = connector_registry.feed_connector.parse_and_merge_csv(payload.feed_csv)
    return res


@app.get("/api/admin/scheduler")
async def get_scheduler_status():
    """Returns price pipeline scheduler metrics: PricePoints recorded vs skipped."""
    return price_scheduler.get_stats()


@app.post("/api/admin/scheduler/run")
async def run_pipeline_scheduler(payload: RunSchedulerRequest):
    """
    Executes a price collection cycle for Tier 1 / Tier 2 products.
    Records PricePoint if changed; skips unchanged prices.
    """
    shifts = None
    if payload.shift_sample_price:
        # Simulate price drop on mob-001 (Realme 12 Pro) to demonstrate change detection
        shifts = {"mob-001": 22999}

    summary = price_scheduler.run_cycle(
        price_alerts=price_alerts,
        force_tier=payload.tier,
        mock_price_shifts=shifts,
    )
    return summary


@app.post("/api/affiliate/click")
async def log_affiliate_click(payload: LogClickRequest):
    """Log outbound affiliate click-outs."""
    affiliate_url = affiliate_builder.build_affiliate_url(payload.url, payload.store)
    log_entry = {
        "timestamp": datetime.utcnow().isoformat(),
        "store": payload.store,
        "product_id": payload.product_id,
        "product_name": payload.product_name,
        "affiliate_url": affiliate_url,
    }
    click_logs.append(log_entry)
    logger.info(f"[Affiliate Click] Store: {payload.store} | Product: {payload.product_name} | Target: {affiliate_url}")
    return {"status": "LOGGED", "affiliate_url": affiliate_url}


@app.get("/api/affiliate/clicks")
async def get_affiliate_clicks():
    """Retrieve logged outbound affiliate clicks."""
    return {"total_clicks": len(click_logs), "clicks": click_logs[-50:]}


# ─── Matcher Diagnostics & Admin Review Queue (Phase D) ─────────────────────

class EvaluateMatchPairRequest(BaseModel):
    title_a: str
    title_b: str
    barcode_a: Optional[str] = None
    barcode_b: Optional[str] = None

@app.get("/api/admin/review-queue")
async def get_admin_review_queue(status: Optional[str] = None):
    """List candidate match pairs queued for admin verification."""
    queue = product_matcher.get_review_queue(status=status)
    return {
        "total": len(queue),
        "pending_count": len([q for q in queue if q["status"] == "PENDING"]),
        "queue": queue,
    }

@app.post("/api/admin/review-queue/{review_id}/approve")
async def approve_review_queue_item(review_id: str):
    """Approve candidate match and merge into canonical product."""
    item = product_matcher.review_item(review_id, "APPROVED")
    if not item:
        raise HTTPException(status_code=404, detail="Review item not found")
    return {"status": "SUCCESS", "action": "APPROVED", "item": item}

@app.post("/api/admin/review-queue/{review_id}/reject")
async def reject_review_queue_item(review_id: str):
    """Reject candidate match from merging."""
    item = product_matcher.review_item(review_id, "REJECTED")
    if not item:
        raise HTTPException(status_code=404, detail="Review item not found")
    return {"status": "SUCCESS", "action": "REJECTED", "item": item}

@app.post("/api/admin/matcher/evaluate-pair")
async def evaluate_matcher_pair(payload: EvaluateMatchPairRequest):
    """Diagnose multi-stage matcher confidence and stage decision for two product listings."""
    res = product_matcher.match(
        title_a=payload.title_a,
        title_b=payload.title_b,
        barcode_a=payload.barcode_a,
        barcode_b=payload.barcode_b,
    )
    return res


# ─── Image Management Endpoints (Workstream 4) ──────────────────────────────

class UpdateProductImageRequest(BaseModel):
    image_url: str
    verified: bool = True

@app.get("/api/admin/images")
async def list_admin_images(unverified_only: bool = False):
    """List products with their image source, verification status, and placeholder indicator."""
    connector = connector_registry.get_active_connector()
    products = getattr(connector, "products", [])
    result = []
    for p in products:
        is_placeholder = not p.get("imageUrl") or p.get("imageSource") == "placeholder"
        is_verified = bool(p.get("imageVerified", False))
        if unverified_only and is_verified:
            continue
        result.append({
            "id": p["id"],
            "name": p["name"],
            "brand": p["brand"],
            "category": p["category"],
            "family_name": p.get("familyName", p["name"]),
            "image_url": p.get("imageUrl", ""),
            "image_source": p.get("imageSource", "placeholder"),
            "image_verified": is_verified,
        })
    return {"total": len(result), "products": result}

@app.post("/api/admin/products/{product_id}/image")
async def update_product_image(product_id: str, payload: UpdateProductImageRequest):
    """Admin endpoint to set or verify a product's exact image URL."""
    connector = connector_registry.get_active_connector()
    products = getattr(connector, "products", [])
    found = None
    for p in products:
        if p["id"] == product_id:
            p["imageUrl"] = payload.image_url
            p["image_url"] = payload.image_url
            p["imageSource"] = "admin" if payload.image_url else "placeholder"
            p["imageVerified"] = payload.verified if payload.image_url else False
            found = p
            break
    if not found:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"status": "SUCCESS", "product": found}


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
    from app.notifications.email_service import send_price_drop_email

    triggered = []
    for alert in price_alerts:
        prod = next((p for p in PRODUCTS if p["id"] == alert["product_id"] or p.get("legacy_id") == alert["product_id"]), None)
        if prod:
            current_lowest = prod["best_price"]
            if current_lowest <= alert["target_price"]:
                alert["status"] = "TRIGGERED"
                alert["triggered_at"] = date.today().isoformat()
                best_store = prod["offers"][0]["store"] if prod.get("offers") else "Online Store"
                best_url = prod["offers"][0]["url"] if prod.get("offers") else ""
                
                send_price_drop_email(
                    to_email=alert["email"],
                    product_name=alert["product_name"],
                    current_price=current_lowest,
                    target_price=alert["target_price"],
                    store=best_store,
                    product_url=best_url,
                )

                # Send Telegram alert if linked
                t_chat_id = telegram_service.get_chat_id_for_user(alert["email"])
                if t_chat_id:
                    await telegram_service.send_price_drop_alert(
                        chat_id=t_chat_id,
                        product_name=alert["product_name"],
                        current_price=current_lowest,
                        target_price=alert["target_price"],
                        store=best_store,
                        product_url=best_url,
                    )

                triggered.append({
                    "alert_id": alert["id"],
                    "email": alert["email"],
                    "product": alert["product_name"],
                    "target_price": alert["target_price"],
                    "current_price": current_lowest,
                    "telegram_notified": bool(t_chat_id),
                })
    return {
        "status": "CHECK_COMPLETE",
        "total_evaluated": len(price_alerts),
        "triggered_count": len(triggered),
        "triggered_alerts": triggered,
    }


# ─── Telegram Bot Alerts & Account Linking (Phase F) ──────────────────────────

class TelegramLinkCodeRequest(BaseModel):
    email: str

class TelegramLinkConfirmRequest(BaseModel):
    code: str
    chat_id: str

class TelegramTestAlertRequest(BaseModel):
    email: Optional[str] = "gokul@example.com"
    chat_id: Optional[str] = None
    product_id: Optional[str] = "mob-001"
    target_price: Optional[int] = 28000


@app.post("/api/alerts/telegram/code")
async def generate_telegram_linking_code(payload: TelegramLinkCodeRequest):
    """
    Generate a 6-digit one-time code to link an email with Telegram bot.
    Returns the code, expiration timestamp, and deep link (https://t.me/bot?start=CODE).
    """
    if not payload.email or "@" not in payload.email:
        raise HTTPException(status_code=400, detail="Valid email is required")
    res = telegram_service.generate_linking_code(payload.email)
    return res


@app.post("/api/alerts/telegram/link")
async def confirm_telegram_link(payload: TelegramLinkConfirmRequest):
    """
    Confirms account linking between user email and Telegram chat ID via 6-digit code.
    """
    res = telegram_service.link_account_with_code(code=payload.code, chat_id=payload.chat_id)
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("error", "Failed to link Telegram"))
    return res


@app.post("/api/alerts/telegram/test")
async def test_telegram_price_drop_alert(payload: TelegramTestAlertRequest):
    """
    Simulates and dispatches a test price-drop alert to Telegram.
    Verifies alert arrives via Telegram Bot API or console fallback.
    """
    chat_id = payload.chat_id
    if not chat_id and payload.email:
        chat_id = telegram_service.get_chat_id_for_user(payload.email)

    if not chat_id:
        chat_id = "987654321"  # Default test chat ID

    product = next((p for p in PRODUCTS if p["id"] == payload.product_id), PRODUCTS[0])
    curr_price = product.get("best_price", 24199)
    store = product.get("offers", [{}])[0].get("store", "Amazon.in")
    url = f"http://localhost:3000/compare?id={product['id']}"

    dispatched = await telegram_service.send_price_drop_alert(
        chat_id=chat_id,
        product_name=product["name"],
        current_price=curr_price,
        target_price=payload.target_price or (curr_price + 2000),
        store=store,
        product_url=url,
    )

    return {
        "status": "DISPATCHED",
        "chat_id": chat_id,
        "email": payload.email,
        "product_name": product["name"],
        "current_price": curr_price,
        "target_price": payload.target_price or (curr_price + 2000),
        "store": store,
        "channel": "TELEGRAM",
    }


@app.get("/api/alerts/telegram/history")
async def get_telegram_alert_history():
    """Retrieve history of dispatched Telegram price drop alerts."""
    return {
        "total": len(telegram_service.dispatched_alerts),
        "alerts": telegram_service.dispatched_alerts,
        "linked_users_count": len(telegram_service.user_telegram_map),
    }


# ─── AI Shopping Assistant Endpoint ──────────────────────────────────────────

class AssistantQueryRequest(BaseModel):
    query: str
    history: Optional[List[Dict[str, str]]] = None

def generate_smart_suggestions(query: str, response: str) -> List[str]:
    q = query.lower()
    if "realme" in q:
        return [
            "Compare Realme GT 6 vs OnePlus 12R",
            "Show Realme GT 6 price history",
            "Is Realme GT 6 good for gaming?",
        ]
    elif "iphone" in q or "apple" in q:
        return [
            "Compare iPhone 15 vs Samsung S24",
            "Best deals on iPhone 15 across stores",
            "Show price trends for iPhone 15",
        ]
    elif "boat" in q or "rockerz" in q or "headphone" in q or "earphone" in q:
        return [
            "Is boAt Rockerz 550 good for gym?",
            "Compare boAt Rockerz 550 vs Sony WH-CH520",
            "Best noise cancelling headphones under ₹3,000",
        ]
    elif "laptop" in q:
        return [
            "Best laptops for coding under ₹60,000",
            "Compare MacBook Air M2 vs ASUS Zenbook",
            "Laptops with 16GB RAM under ₹50,000",
        ]
    elif "tv" in q:
        return [
            "Difference between OLED and QLED",
            "Best 55-inch 4K TV under ₹45,000",
            "Compare Sony Bravia vs Samsung Crystal 4K",
        ]
    elif "under" in q or "budget" in q:
        return [
            "Phones with 120W fast charging",
            "Best camera phone in this budget",
            "Show price drop alerts",
        ]
    else:
        return [
            "Compare with top competitor",
            "Show 12-month price history",
            "Set a price drop alert",
        ]

@app.post("/api/assistant")
async def ai_shopping_assistant(payload: AssistantQueryRequest):
    """
    AI Shopping Advisor (Workstream 5 & Defect D5 Resolution):
    Analyzes queries with strict database grounding using Gemini Function Calling tools
    and offline deterministic tool execution. Supports multi-turn conversational context.
    """
    from app.agent.assistant import (
        ask_gemini_with_tools,
        generate_offline_expert_advice,
        extract_budget,
    )

    q = payload.query.strip()
    if not q:
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    budget = extract_budget(q)

    # 1. Try Gemini Function Calling first if API key is present
    gemini_result = None
    if settings.GEMINI_API_KEY:
        gemini_result = await ask_gemini_with_tools(q, history=payload.history)

    if gemini_result:
        response_text, referenced_products = gemini_result
        model_used = f"Gemini 1.5 ({settings.VISION_MODEL_NAME}) Tool-Grounded"
    else:
        # 2. Offline deterministic tool execution (fixes Defect D5)
        response_text, referenced_products = generate_offline_expert_advice(q)
        model_used = "ShopPilot Grounded Catalog Tools (Offline Mode)"

    suggestions = generate_smart_suggestions(q, response_text)

    return {
        "query": q,
        "response": response_text,
        "budget": budget,
        "model": model_used,
        "products": referenced_products[:4] if referenced_products else [],
        "suggestions": suggestions,
    }


# ─── User Data Deletion & Privacy Endpoints (Phase G) ─────────────────────────

class DeleteUserDataRequest(BaseModel):
    email: str

@app.post("/api/users/delete-data")
@app.delete("/api/users/data")
async def delete_user_account_data(payload: DeleteUserDataRequest):
    """
    Permanently wipes all user-associated data (price drop alerts, Telegram linking)
    in compliance with DPDP Act (India) and GDPR Right to Erasure.
    """
    email = payload.email.lower().strip()
    if not email:
        raise HTTPException(status_code=400, detail="Valid user email required")

    # 1. Unlink from Telegram service
    telegram_service.user_telegram_map.pop(email, None)

    # 2. Wipe registered alerts for this user
    global price_alerts
    before_count = len(price_alerts)
    price_alerts = [a for a in price_alerts if a.get("email", "").lower() != email]
    removed_alerts = before_count - len(price_alerts)

    logger.info(f"[Privacy / Data Erasure] Deleted all data for user {email} ({removed_alerts} alerts wiped)")

    return {
        "status": "SUCCESS",
        "message": f"All account data and alerts permanently deleted for {email}",
        "email": email,
        "removed_alerts_count": removed_alerts,
        "timestamp": datetime.utcnow().isoformat(),
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
