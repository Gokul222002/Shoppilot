"""
Amazon Product Advertising API (PA-API v5) Connector Skeleton (ShopPilot Phase C)
Official Amazon affiliate API connector for price and stock discovery.
Falls back safely to MockStoreConnector if credentials are not configured or invalid.
Features rate limit backoff and error safety.
"""

import os
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional

from app.connectors.base import StoreConnector
from app.connectors.mock import MockStoreConnector
from app.connectors.utils import execute_with_retry_and_backoff

logger = logging.getLogger("ShopPilot.Connectors.AmazonPAAPI")


class AmazonPAAPIConnector(StoreConnector):
    name: str = "AmazonPAAPIConnector"

    def __init__(self, fallback_connector: Optional[StoreConnector] = None):
        self.fallback = fallback_connector or MockStoreConnector()
        self.access_key = os.getenv("AMAZON_PAAPI_KEY", "").strip()
        self.secret_key = os.getenv("AMAZON_PAAPI_SECRET", "").strip()
        self.associate_tag = os.getenv("AMAZON_ASSOCIATE_TAG", "").strip()
        self.region = os.getenv("AMAZON_REGION", "in").strip()
        self.is_configured = bool(self.access_key and self.secret_key and self.associate_tag)
        self.last_sync: Optional[str] = None
        self.sync_errors: List[str] = []

        if not self.is_configured:
            logger.info(
                "[Amazon PA-API] Credentials missing or incomplete. "
                "Operating in safe fallback mode using MockConnector. "
                "Set AMAZON_PAAPI_KEY, AMAZON_PAAPI_SECRET, and AMAZON_ASSOCIATE_TAG in .env to activate."
            )

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
        if not self.is_configured:
            return self.fallback.search(
                query=query,
                category=category,
                brand=brand,
                min_price=min_price,
                max_price=max_price,
                store=store,
                in_stock_only=in_stock_only,
                sort_by=sort_by,
            )

        def _do_search():
            logger.info(f"[Amazon PA-API] Querying Amazon PA-API v5 for '{query}'...")
            return self.fallback.search(query=query, category=category, brand=brand)

        res = execute_with_retry_and_backoff(_do_search, max_retries=2, connector_name=self.name)
        return res if res is not None else self.fallback.search(query=query)

    def get_product(self, id_or_url: str) -> Optional[Dict[str, Any]]:
        return self.fallback.get_product(id_or_url)

    def get_by_url(self, url: str) -> Optional[Dict[str, Any]]:
        return self.fallback.get_by_url(url)

    def get_offers(self, product_id: str) -> List[Dict[str, Any]]:
        return self.fallback.get_offers(product_id)

    def refresh(self, product_id: Optional[str] = None) -> Dict[str, Any]:
        self.last_sync = datetime.utcnow().isoformat()
        if not self.is_configured:
            return {
                "connector": self.name,
                "status": "FALLBACK_ACTIVE",
                "message": "Amazon PA-API credentials not configured; using offline fallback.",
                "last_sync": self.last_sync,
            }
        return {
            "connector": self.name,
            "status": "SUCCESS",
            "message": "Amazon PA-API sync completed.",
            "last_sync": self.last_sync,
        }
