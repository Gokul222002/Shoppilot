"""
Price Pipeline Scheduler (ShopPilot Phase C)
Refreshes popular and tracked products more often than the long tail.
Stores each price change as a PricePoint; skips unchanged prices.
"""

import logging
from datetime import datetime
from typing import List, Dict, Any, Optional

logger = logging.getLogger("ShopPilot.Connectors.Scheduler")


class PricePoint:
    def __init__(self, product_id: str, product_name: str, store: str, price: int, recorded_at: str):
        self.product_id = product_id
        self.product_name = product_name
        self.store = store
        self.price = price
        self.recorded_at = recorded_at

    def to_dict(self) -> Dict[str, Any]:
        return {
            "product_id": self.product_id,
            "product_name": self.product_name,
            "store": self.store,
            "price": self.price,
            "recorded_at": self.recorded_at,
        }


class PricePipelineScheduler:
    """
    Tiered scheduler managing product price sync cycles:
    - Tier 1: Tracked & Popular products (refreshed frequently)
    - Tier 2: Long-tail products
    - Price change detection: Records PricePoint on change; skips unchanged prices.
    """

    def __init__(self, mock_connector=None):
        self.connector = mock_connector
        self.price_history_records: List[PricePoint] = []
        # Map: (product_id, store) -> last_recorded_price
        self.last_known_prices: Dict[str, int] = {}
        self.total_skipped_unchanged: int = 0
        self.total_points_recorded: int = 0
        self.last_run_timestamp: Optional[str] = None
        self.last_run_summary: Dict[str, Any] = {}

    def set_connector(self, connector):
        self.connector = connector

    def _get_tracked_product_ids(self, price_alerts: List[Dict[str, Any]]) -> set:
        return {a["product_id"] for a in price_alerts if a.get("product_id")}

    def run_cycle(
        self,
        price_alerts: Optional[List[Dict[str, Any]]] = None,
        force_tier: Optional[str] = None,
        mock_price_shifts: Optional[Dict[str, int]] = None,
    ) -> Dict[str, Any]:
        """
        Executes a price collection cycle.
        Categorizes products into Tier 1 (tracked by alerts or popular) vs Tier 2 (long tail).
        Records PricePoints when price changes, skips unchanged prices.
        """
        if not self.connector:
            return {"status": "ERROR", "message": "No connector attached to scheduler"}

        alerts = price_alerts or []
        tracked_ids = self._get_tracked_product_ids(alerts)
        products = getattr(self.connector, "products", [])

        tier1_prods = []
        tier2_prods = []

        for p in products:
            pid = p["id"]
            is_popular = p.get("review_count", 0) >= 5000
            is_tracked = pid in tracked_ids
            if is_tracked or is_popular:
                tier1_prods.append(p)
            else:
                tier2_prods.append(p)

        target_prods = products
        if force_tier == "tier1":
            target_prods = tier1_prods
        elif force_tier == "tier2":
            target_prods = tier2_prods

        now_iso = datetime.utcnow().isoformat()
        recorded_this_run = 0
        skipped_this_run = 0

        for p in target_prods:
            pid = p["id"]
            pname = p["name"]

            # Check if simulation shifts exist for testing price change recording
            if mock_price_shifts and pid in mock_price_shifts:
                for off in p.get("offers", []):
                    off["price"] = mock_price_shifts[pid]

            for offer in p.get("offers", []):
                store = offer.get("store", "Store")
                current_price = offer.get("price", 0)
                key = f"{pid}:{store}"

                last_price = self.last_known_prices.get(key)
                if last_price is None or last_price != current_price:
                    # Price changed or initial observation -> Record PricePoint
                    pp = PricePoint(
                        product_id=pid,
                        product_name=pname,
                        store=store,
                        price=current_price,
                        recorded_at=now_iso,
                    )
                    self.price_history_records.append(pp)
                    self.last_known_prices[key] = current_price
                    self.total_points_recorded += 1
                    recorded_this_run += 1
                else:
                    # Price unchanged -> Skip recording redundant PricePoint
                    self.total_skipped_unchanged += 1
                    skipped_this_run += 1

        self.last_run_timestamp = now_iso
        self.last_run_summary = {
            "timestamp": now_iso,
            "tier1_count": len(tier1_prods),
            "tier2_count": len(tier2_prods),
            "products_scanned": len(target_prods),
            "price_points_recorded": recorded_this_run,
            "unchanged_skipped": skipped_this_run,
            "total_lifetime_points": self.total_points_recorded,
            "total_lifetime_skipped": self.total_skipped_unchanged,
        }

        logger.info(
            f"[Pipeline Scheduler] Cycle finished: {recorded_this_run} price points recorded, "
            f"{skipped_this_run} unchanged skipped."
        )
        return self.last_run_summary

    def get_stats(self) -> Dict[str, Any]:
        return {
            "last_run": self.last_run_timestamp,
            "summary": self.last_run_summary,
            "total_points_recorded": self.total_points_recorded,
            "total_skipped_unchanged": self.total_skipped_unchanged,
            "unique_tracked_offers": len(self.last_known_prices),
            "recent_price_points": [pp.to_dict() for pp in self.price_history_records[-10:]],
        }


price_scheduler = PricePipelineScheduler()
