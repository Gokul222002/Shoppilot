"""
Mock Store Connector (ShopPilot Phase C)
Default offline provider backed by 315 products, 8 categories, 917 store offers,
and 12 months of daily price history.
Supports store filtering (enabling/disabling stores) and feed offer merging.
"""

import os
import json
import logging
from typing import List, Dict, Any, Optional, Set

from app.connectors.base import StoreConnector
from app.search_engine import search_catalog_fuzzy

logger = logging.getLogger("ShopPilot.Connectors.Mock")

CATALOG_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "catalog.json")


class MockStoreConnector(StoreConnector):
    name: str = "MockConnector"

    def __init__(self, catalog_path: Optional[str] = None):
        self.catalog_path = catalog_path or CATALOG_PATH
        self.products: List[Dict[str, Any]] = []
        self.disabled_stores: Set[str] = set()
        self.last_sync: Optional[str] = None
        self.sync_errors: List[str] = []
        self._load_catalog()

    def _load_catalog(self):
        if os.path.exists(self.catalog_path):
            with open(self.catalog_path, "r", encoding="utf-8") as f:
                loaded = json.load(f)
                self.products = []
                for p in loaded:
                    # Guarantee region and currency on offers
                    for o in p.get("offers", []):
                        o.setdefault("region", "IN")
                        o.setdefault("currency", "INR")
                        o.setdefault("shipping_fee", 0)

                    self._recalculate_product_metrics(p)
                    p["price_history"] = p.get("priceHistory", [])
                    p["image_url"] = p.get("imageUrl", "")
                    p["review_count"] = p.get("reviewCount", 0)
                    self.products.append(p)
            from datetime import datetime
            self.last_sync = datetime.utcnow().isoformat()
            logger.info(f"Loaded {len(self.products)} products into MockStoreConnector.")
        else:
            logger.warning(f"Catalog file not found at {self.catalog_path}")

    def _recalculate_product_metrics(self, p: Dict[str, Any]):
        """Recalculate lowest price and discount based on currently enabled stores."""
        enabled_offers = [o for o in p.get("offers", []) if o.get("store") not in self.disabled_stores]
        if enabled_offers:
            bp = min(o["price"] for o in enabled_offers)
            mp = max(o["mrp"] for o in enabled_offers)
            pct = round(((mp - bp) / mp) * 100) if mp > 0 else 0
            p["best_price"] = bp
            p["mrp"] = mp
            p["best_discount_pct"] = pct
        elif p.get("offers"):
            # If all offers disabled, retain original baseline but mark 0 offers
            p["best_price"] = p["offers"][0]["price"]
            p["mrp"] = p["offers"][0]["mrp"]
            p["best_discount_pct"] = 0

    def disable_store(self, store_name: str):
        self.disabled_stores.add(store_name)
        for p in self.products:
            self._recalculate_product_metrics(p)
        logger.info(f"Store '{store_name}' disabled. Disabled stores: {self.disabled_stores}")

    def enable_store(self, store_name: str):
        self.disabled_stores.discard(store_name)
        for p in self.products:
            self._recalculate_product_metrics(p)
        logger.info(f"Store '{store_name}' enabled. Disabled stores: {self.disabled_stores}")

    def get_known_stores(self) -> List[Dict[str, Any]]:
        store_counts: Dict[str, int] = {}
        for p in self.products:
            for o in p.get("offers", []):
                s = o.get("store", "Unknown")
                store_counts[s] = store_counts.get(s, 0) + 1

        return [
            {
                "name": s,
                "enabled": s not in self.disabled_stores,
                "offer_count": count,
            }
            for s, count in sorted(store_counts.items(), key=lambda x: x[1], reverse=True)
        ]

    def _find_raw_product(self, id_or_identifier: str) -> Optional[Dict[str, Any]]:
        target = id_or_identifier.strip().lower()
        for p in self.products:
            if p["id"].lower() == target or p.get("slug", "").lower() == target:
                return p
            if p.get("barcode", "").lower() == target:
                return p
            if p.get("legacy_id", "").lower() == target:
                return p
            if target in p["name"].lower():
                return p
        return None

    def merge_external_offer(
        self,
        product_identifier: str,
        store: str,
        price: int,
        mrp: int,
        delivery_days: int = 2,
        seller_rating: float = 4.5,
        in_stock: bool = True,
        url: str = "",
        shipping_fee: int = 0,
        region: str = "IN",
        currency: str = "INR",
        product_id: Optional[str] = None,
        barcode: Optional[str] = None,
        data_source: str = "feed",
    ) -> bool:
        """
        Merges or updates an external store offer into an existing canonical product.
        product_identifier matches barcode, id, slug, or exact product_name.
        """
        from datetime import datetime, timezone
        ts_now = datetime.now(timezone.utc).isoformat()

        prod = None
        if product_id:
            prod = self._find_raw_product(product_id)
        if not prod and barcode:
            prod = self._find_raw_product(barcode)
        if not prod and product_identifier:
            prod = self._find_raw_product(product_identifier)

        if not prod:
            # Try fuzzy search
            results = search_catalog_fuzzy(catalog=self.products, query=product_identifier)
            if results:
                matched_id = results[0]["id"]
                prod = next((p for p in self.products if p["id"] == matched_id), None)

        if not prod:
            return False

        # Check if offer for this store already exists
        existing_offer = next((o for o in prod.get("offers", []) if o.get("store").lower() == store.lower()), None)
        if existing_offer:
            existing_offer.update({
                "price": price,
                "mrp": mrp,
                "discount_pct": round(((mrp - price) / mrp) * 100) if mrp > 0 else 0,
                "delivery_days": delivery_days,
                "seller_rating": seller_rating,
                "in_stock": in_stock,
                "url": url or existing_offer.get("url", ""),
                "shipping_fee": shipping_fee,
                "region": region,
                "currency": currency,
                "dataSource": data_source,
                "last_updated": ts_now,
                "is_demo": False,
                "verified": True,
            })
        else:
            new_offer = {
                "store": store,
                "price": price,
                "mrp": mrp,
                "discount_pct": round(((mrp - price) / mrp) * 100) if mrp > 0 else 0,
                "delivery_days": delivery_days,
                "seller_rating": seller_rating,
                "in_stock": in_stock,
                "url": url,
                "shipping_fee": shipping_fee,
                "region": region,
                "currency": currency,
                "dataSource": data_source,
                "last_updated": ts_now,
                "is_demo": False,
                "verified": True,
            }
            prod.setdefault("offers", []).append(new_offer)

        self._recalculate_product_metrics(prod)
        return True

    def _filter_product_offers(self, product: Dict[str, Any]) -> Dict[str, Any]:
        """Returns a copy of product with disabled store offers omitted."""
        p_copy = dict(product)
        p_copy["offers"] = [o for o in product.get("offers", []) if o.get("store") not in self.disabled_stores]
        return p_copy

    def search(
        self,
        query: str,
        category: Optional[str] = None,
        brand: Optional[str] = None,
        min_price: Optional[int] = None,
        max_price: Optional[int] = None,
        store: Optional[str] = None,
        in_stock_only: Optional[bool] = None,
        sort_by: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        results = search_catalog_fuzzy(
            catalog=self.products,
            query=query,
            category=category,
            brand=brand,
            min_price=min_price,
            max_price=max_price,
            store=store,
            in_stock_only=in_stock_only,
            sort_by=sort_by,
        )
        # Filter disabled store offers from results
        return [self._filter_product_offers(p) for p in results]

    def get_product(self, id_or_url: str) -> Optional[Dict[str, Any]]:
        target = id_or_url.strip().lower()
        for p in self.products:
            if p["id"].lower() == target or p.get("slug", "").lower() == target:
                return self._filter_product_offers(p)
            if p.get("barcode") == target:
                return self._filter_product_offers(p)
            if p.get("legacy_id", "").lower() == target:
                return self._filter_product_offers(p)
            if target in p["name"].lower():
                return self._filter_product_offers(p)
        return None

    def get_by_url(self, url: str) -> Optional[Dict[str, Any]]:
        clean_url = url.strip().lower()
        for p in self.products:
            for o in p.get("offers", []):
                if o.get("url", "").lower() == clean_url:
                    return self._filter_product_offers(p)
        return None

    def get_offers(self, product_id: str) -> List[Dict[str, Any]]:
        prod = self.get_product(product_id)
        if prod:
            return prod.get("offers", [])
        return []

    def refresh(self, product_id: Optional[str] = None) -> Dict[str, Any]:
        from datetime import datetime
        self.last_sync = datetime.utcnow().isoformat()
        return {
            "connector": self.name,
            "status": "SUCCESS",
            "last_sync": self.last_sync,
            "products_count": len(self.products),
            "errors": self.sync_errors,
        }
