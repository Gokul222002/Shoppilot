# ShopPilot Operations & Engineering Runbook

Welcome to the **ShopPilot Production Runbook**. This guide details operational procedures for maintaining, updating, and scaling ShopPilot.

> [!IMPORTANT]
> **Core Architectural Rule:** ShopPilot is **strictly a price comparison engine**. It does not maintain a cart, does not operate a checkout, and sells zero inventory. All outbound clicks go through affiliate links (`target="_blank" rel="noopener noreferrer"`). Never implement ecommerce checkout flows in this codebase.

---

## 1. Adding a New Store Connector

ShopPilot's pluggable architecture allows integrating any new retailer (e.g. Reliance Digital, Vijay Sales, JioMart) in four modular steps:

### Step 1: Subclass `StoreConnector`
Create `backend/app/connectors/new_store.py`:
```python
from typing import List, Optional, Dict, Any
from app.connectors.base import StoreConnector, RawStoreOffer

class NewStoreConnector(StoreConnector):
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key

    @property
    def store_name(self) -> str:
        return "Reliance Digital"

    @property
    def store_key(self) -> str:
        return "reliance_digital"

    async def search(self, query: str, limit: int = 5) -> List[RawStoreOffer]:
        # Connect to store API or affiliate feed
        return []

    async def get_by_url(self, url: str) -> Optional[RawStoreOffer]:
        return None

    async def refresh_offers(self, product_id: str) -> List[RawStoreOffer]:
        return []
```

### Step 2: Register in `ConnectorRegistry`
In `backend/app/connectors/registry.py`:
```python
from app.connectors.new_store import NewStoreConnector
connector_registry.register(NewStoreConnector())
```

### Step 3: Register Affiliate Link Builder
In `backend/app/connectors/affiliate.py`:
```python
affiliate_builder.register_store(
    store_name="Reliance Digital",
    base_affiliate_url="https://cuelinks.com/rd?url={encoded_url}&tag={tag}",
    default_tag=os.getenv("RELIANCE_AFFILIATE_TAG", "shoppilot-21")
)
```

### Step 4: Add Store UI Badging
In `frontend/src/components/OfferRow.tsx` and `ProductCard.tsx`:
Add `"Reliance Digital": "bg-red-600"` to `STORE_COLORS`.

---

## 2. Rerunning Store Syncs & Feed Ingestion

### Triggering Connector Sync via Admin API
```bash
curl -X POST https://shoppilot-backend-jts2.onrender.com/api/admin/connectors/amazon_paapi/trigger-sync \
  -H "X-Admin-Key: $ADMIN_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{"simulate_failure": false}'
```

### Running the Price Scheduler Cycle
The scheduler checks for real price movements and records `PricePoints` while skipping unchanged prices:
```bash
curl -X POST https://shoppilot-backend-jts2.onrender.com/api/admin/scheduler/run \
  -H "X-Admin-Key: $ADMIN_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{"tier": "popular"}'
```

### Merchant Feed CSV Ingestion
Format: `product_name, store, price, mrp, in_stock, shipping, delivery_days, seller_rating, product_url, barcode`
Upload directly via the web interface at `/admin` (Section 3) or submit via API:
```bash
curl -X POST https://shoppilot-backend-jts2.onrender.com/api/admin/feed/upload \
  -H "X-Admin-Key: $ADMIN_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{"feed_csv": "Realme 12 Pro 5G,Croma,23999,28999,true,0,2,4.6,https://croma.com/p/123,890100mob-001"}'
```

---

## 3. Database Restore & Data Integrity

### Restoring PostgreSQL on Render
1. Connect via `psql`:
   ```bash
   psql $DATABASE_URL
   ```
2. Re-apply schema & seed data:
   ```bash
   python backend/build_seed.py
   ```
3. SQLite offline local fallback is automatically maintained at `backend/shoppilot.db`.

---

## 4. Render Free-Tier Sleep Problem Mitigation

### The Issue
Render free web services spin down automatically after 15 minutes of zero inbound traffic. The subsequent HTTP request triggers a cold container boot that takes 45 to 55 seconds.

### Solution A: Paid Instance Upgrade (Recommended for Launch)
- Upgrade `shoppilot-backend` from **Free** to **Starter** ($7/month) in the Render dashboard.
- Starter instances remain warm 24/7 with dedicated CPU allocation, eliminating cold starts entirely.

### Solution B: Automated Uptime Ping (Zero-Cost Keep-Alive)
Set up a lightweight HTTP monitor to ping `/health` every 10 minutes:
1. Create a free monitor on [UptimeRobot](https://uptimerobot.com) or [BetterStack](https://betterstack.com).
2. Set URL: `https://shoppilot-backend-jts2.onrender.com/health`
3. Interval: 10 minutes (HTTP GET, expects 200 OK).
4. This ensures the Docker container stays warm continuously throughout active shopping hours.

---

## 5. Security & Admin Operations

### Admin Route Protection
All `/api/admin/*` endpoints require the `X-Admin-Key` header matching `ADMIN_SECRET_KEY`. Requests without this key in production receive `403 Forbidden`.

### User Right to Erasure (DPDP Act / GDPR)
To manually erase a user's alerts and Telegram link:
```bash
curl -X POST https://shoppilot-backend-jts2.onrender.com/api/users/delete-data \
  -H "Content-Type: application/json" \
  -d '{"email": "shopper@example.com"}'
```
