"""
Pricing Anomaly & Glitch Detection Engine (ShopPilot Phase E)
Prevents suspicious pricing errors (e.g. 70% below rolling median)
from appearing in the public deals feed until verified by an administrator.
"""

import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger("ShopPilot.ML.Anomaly")


class PricingAnomalyDetector:
    def __init__(self, extreme_drop_threshold: float = 0.70):
        # 0.70 = 70% below rolling median
        self.extreme_drop_threshold = extreme_drop_threshold
        self.held_anomalies: List[Dict[str, Any]] = [
            # Seed a sample verified glitch for demonstration
            {
                "id": "anom-001",
                "product_id": "lap-001",
                "product_name": "Apple MacBook Air M2 Chip (13.6-inch, 8GB, 256GB)",
                "store": "Tata CLiQ",
                "offer_price": 24990,
                "rolling_median": 87990,
                "drop_pct": 71.6,
                "status": "HELD_FOR_VERIFICATION",
                "reason": "Suspicious price drop: 71.6% below 60-day median (₹24,990 vs ₹87,990). Potential merchant decimal point error.",
                "created_at": "2026-11-08T00:30:00Z",
            }
        ]

    def check_offer(
        self,
        product_id: str,
        product_name: str,
        store: str,
        offer_price: int,
        rolling_median: int,
    ) -> Dict[str, Any]:
        """
        Inspects an offer price against its historical rolling median.
        Returns:
            is_anomaly: bool
            held_for_verification: bool
            reason: str
        """
        if rolling_median <= 0 or offer_price <= 0:
            return {"is_anomaly": False, "held_for_verification": False, "reason": "No baseline median."}

        drop_pct = ((rolling_median - offer_price) / rolling_median) * 100

        # Anomaly condition: price is >= 70% below rolling median
        if drop_pct >= (self.extreme_drop_threshold * 100):
            anomaly_id = f"anom-{len(self.held_anomalies) + 1:03d}"
            record = {
                "id": anomaly_id,
                "product_id": product_id,
                "product_name": product_name,
                "store": store,
                "offer_price": offer_price,
                "rolling_median": rolling_median,
                "drop_pct": round(drop_pct, 1),
                "status": "HELD_FOR_VERIFICATION",
                "reason": f"Suspicious price drop: {round(drop_pct, 1)}% below 60-day median (₹{offer_price:,} vs ₹{rolling_median:,}). Potential merchant decimal error.",
                "created_at": "2026-11-08T00:00:00Z",
            }
            # Append if not already present
            existing = next((a for a in self.held_anomalies if a["product_id"] == product_id and a["store"] == store), None)
            if not existing:
                self.held_anomalies.append(record)

            return {
                "is_anomaly": True,
                "held_for_verification": True,
                "anomaly_id": anomaly_id,
                "drop_pct": round(drop_pct, 1),
                "reason": record["reason"],
            }

        return {
            "is_anomaly": False,
            "held_for_verification": False,
            "drop_pct": round(drop_pct, 1),
            "reason": "Normal price variation within safety threshold.",
        }

    def get_held_anomalies(self, status: Optional[str] = None) -> List[Dict[str, Any]]:
        if status:
            return [a for a in self.held_anomalies if a["status"] == status]
        return self.held_anomalies

    def resolve_anomaly(self, anomaly_id: str, action: str) -> Optional[Dict[str, Any]]:
        act = action.upper()
        if act not in ("APPROVED", "DISMISSED"):
            return None
        item = next((a for a in self.held_anomalies if a["id"] == anomaly_id), None)
        if item:
            item["status"] = act
            return item
        return None


anomaly_detector = PricingAnomalyDetector()
