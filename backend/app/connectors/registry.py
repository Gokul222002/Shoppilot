"""
Connector Registry & Manager (ShopPilot Phase C)
Pluggable orchestrator managing Mock, Amazon PA-API, Flipkart, and Merchant Feed connectors.
Respects USE_MOCK_DATA feature flag and fails safely with zero external API keys.
Maintains sync statuses and error histories for Admin view.
"""

import os
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any

from app.connectors.base import StoreConnector
from app.connectors.mock import MockStoreConnector
from app.connectors.amazon import AmazonCreatorsConnector, AmazonPAAPIConnector
from app.connectors.flipkart import FlipkartAffiliateConnector
from app.connectors.feed_importer import MerchantFeedConnector
from app.connectors.scheduler import price_scheduler

logger = logging.getLogger("ShopPilot.Connectors.Registry")


class ConnectorRegistry:
    def __init__(self):
        self.mock_connector = MockStoreConnector()
        self.amazon_connector = AmazonCreatorsConnector(fallback_connector=self.mock_connector)
        self.flipkart_connector = FlipkartAffiliateConnector(fallback_connector=self.mock_connector)
        self.feed_connector = MerchantFeedConnector(fallback_connector=self.mock_connector)

        self.connectors: Dict[str, StoreConnector] = {
            "mock": self.mock_connector,
            "amazon": self.amazon_connector,
            "flipkart": self.flipkart_connector,
            "feed": self.feed_connector,
        }

        # Wire up scheduler
        price_scheduler.set_connector(self.mock_connector)

        # Connector sync telemetry & logs
        self.sync_history: Dict[str, Dict[str, Any]] = {
            "mock": {
                "status": "HEALTHY",
                "last_sync": datetime.utcnow().isoformat(),
                "error": None,
                "items_count": len(self.mock_connector.products),
            },
            "amazon": {
                "status": "FALLBACK_ACTIVE" if not self.amazon_connector.is_configured else "HEALTHY",
                "last_sync": datetime.utcnow().isoformat(),
                "error": None if self.amazon_connector.is_configured else "Creators API credentials absent; offline fallback engaged.",
                "items_count": len(self.mock_connector.products),
            },
            "flipkart": {
                "status": "FALLBACK_ACTIVE" if not self.flipkart_connector.is_configured else "HEALTHY",
                "last_sync": datetime.utcnow().isoformat(),
                "error": None if self.flipkart_connector.is_configured else "Affiliate token absent; offline fallback engaged.",
                "items_count": len(self.mock_connector.products),
            },
            "feed": {
                "status": "HEALTHY",
                "last_sync": datetime.utcnow().isoformat(),
                "error": None,
                "items_count": self.feed_connector.imported_offers_count,
            },
        }

    @property
    def use_mock(self) -> bool:
        val = os.getenv("USE_MOCK_DATA", "true").strip().lower()
        return val in ("true", "1", "yes")

    def get_active_connector(self) -> StoreConnector:
        """
        Returns active connector. If USE_MOCK_DATA is true, always returns MockStoreConnector.
        Otherwise returns the configured primary connector or falls back cleanly.
        """
        if self.use_mock:
            return self.mock_connector

        primary = os.getenv("PRIMARY_CONNECTOR", "amazon").strip().lower()
        connector = self.connectors.get(primary)
        if connector:
            return connector
        return self.mock_connector

    def list_connectors(self) -> List[Dict[str, Any]]:
        return [
            {
                "key": k,
                "name": conn.name,
                "is_configured": getattr(conn, "is_configured", True),
                "is_active": k == "mock" if self.use_mock else k == os.getenv("PRIMARY_CONNECTOR", "amazon"),
                "status": self.sync_history.get(k, {}).get("status", "READY"),
                "last_sync": self.sync_history.get(k, {}).get("last_sync"),
                "last_error": self.sync_history.get(k, {}).get("error"),
            }
            for k, conn in self.connectors.items()
        ]

    def trigger_sync(self, connector_key: str, simulate_failure: bool = False) -> Dict[str, Any]:
        """
        Triggers a manual refresh of the specified connector.
        Handles errors gracefully and updates telemetry without crashing.
        """
        conn = self.connectors.get(connector_key.lower())
        if not conn:
            return {"status": "ERROR", "message": f"Connector '{connector_key}' not found"}

        now_iso = datetime.utcnow().isoformat()

        if simulate_failure:
            self.sync_history[connector_key] = {
                "status": "ERROR",
                "last_sync": now_iso,
                "error": f"Simulated 429 RateLimitExceeded on {conn.name}. Non-breaking fallback maintained.",
                "items_count": 0,
            }
            return {
                "connector": conn.name,
                "status": "ERROR",
                "message": "Connector reported error. Fallback kept active so user pages do not crash.",
                "last_sync": now_iso,
            }

        try:
            res = conn.refresh()
            self.sync_history[connector_key] = {
                "status": res.get("status", "HEALTHY"),
                "last_sync": now_iso,
                "error": None,
                "items_count": len(getattr(conn, "products", self.mock_connector.products)),
            }
            return {
                "connector": conn.name,
                "status": "SUCCESS",
                "details": res,
                "last_sync": now_iso,
            }
        except Exception as e:
            err_msg = f"Sync exception: {str(e)}"
            logger.error(f"[{conn.name}] Sync error: {err_msg}")
            self.sync_history[connector_key] = {
                "status": "ERROR",
                "last_sync": now_iso,
                "error": err_msg,
                "items_count": 0,
            }
            return {
                "connector": conn.name,
                "status": "ERROR",
                "message": err_msg,
                "last_sync": now_iso,
            }


connector_registry = ConnectorRegistry()
