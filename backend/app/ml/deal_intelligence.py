"""
Deal Intelligence & Real-Discount Detector (ShopPilot Phase E)
Uses rolling median baseline price instead of retailer-manipulated MRP.
Detects pre-sale artificial price inflation (e.g. 'Price raised 18% twelve days before this sale').
Distinguishes Genuine Deals, Inflated MRPs, Pre-Sale Price Hikes, and Average Prices.
"""

from datetime import date, datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple


def compute_median(values: List[float]) -> float:
    if not values:
        return 0.0
    s = sorted(values)
    n = len(s)
    mid = n // 2
    if n % 2 == 1:
        return float(s[mid])
    return (s[mid - 1] + s[mid]) / 2.0


class DealIntelligenceEngine:
    def __init__(self, median_window_days: int = 60, inflation_lookback_days: int = 30):
        self.median_window_days = median_window_days
        self.inflation_lookback_days = inflation_lookback_days

    def analyze_deal_quality(
        self,
        current_price: int,
        mrp: int,
        price_history: List[Dict[str, Any]],
        ref_date: Optional[date] = None,
    ) -> Dict[str, Any]:
        """
        Analyzes the authenticity and value of an offer's price.
        Calculates:
        - Real discount % vs 60-day rolling median
        - Pre-sale price hike detection with exact day & percentage evidence
        - Deal classification: GENUINE | FAKE_INFLATED_MRP | PRE_SALE_PRICE_HIKE | AVERAGE
        """
        curr = float(current_price)
        mrp_float = float(mrp) if mrp and mrp > current_price else curr

        # Retailer claimed discount
        claimed_discount_pct = round(((mrp_float - curr) / mrp_float) * 100) if mrp_float > 0 else 0

        if not price_history or len(price_history) < 14:
            return {
                "assessment": "AVERAGE",
                "claimed_discount_pct": claimed_discount_pct,
                "real_discount_pct": 0,
                "rolling_median": int(curr),
                "is_inflated": False,
                "inflation_evidence": None,
                "summary": "Insufficient historical points to establish 60-day baseline.",
            }

        parsed: List[Tuple[date, float]] = []
        for pt in price_history:
            try:
                d_str = pt.get("date", "")
                p_val = float(pt.get("price", 0))
                if d_str and p_val > 0:
                    d_obj = datetime.strptime(d_str[:10], "%Y-%m-%d").date()
                    parsed.append((d_obj, p_val))
            except Exception:
                continue

        parsed.sort(key=lambda x: x[0])
        prices = [p for _, p in parsed]

        # Calculate rolling median over last 60 days (or available)
        recent_window = prices[-self.median_window_days:]
        rolling_median = compute_median(recent_window)

        # Real discount relative to rolling median
        real_discount_pct = round(((rolling_median - curr) / rolling_median) * 100, 1)

        # ─── Pre-Sale Inflation Detection ────────────────────────────────────
        # Inspect price movement 7 to 25 days before current date
        is_inflated = False
        inflation_evidence = None
        max_pre_sale_price = 0.0
        days_before_peak = 0
        hike_pct = 0.0

        if len(parsed) >= 20:
            today_idx = len(parsed) - 1
            # Look at points between 20 days ago and 3 days ago
            lookback_pts = parsed[-25:-2]
            baseline_before_hike = compute_median([p for _, p in parsed[-60:-25]]) if len(parsed) >= 60 else rolling_median

            for d, p in lookback_pts:
                if baseline_before_hike > 0:
                    pct_above_base = ((p - baseline_before_hike) / baseline_before_hike) * 100
                    if pct_above_base >= 10.0 and p > max_pre_sale_price:
                        max_pre_sale_price = p
                        days_before_peak = (parsed[-1][0] - d).days
                        hike_pct = round(pct_above_base, 1)

            if hike_pct >= 10.0 and days_before_peak > 0:
                is_inflated = True
                inflation_evidence = f"Price raised {int(hike_pct)}% {days_before_peak} days before this sale."

        # ─── Deal Quality Classification ─────────────────────────────────────
        if is_inflated:
            assessment = "PRE_SALE_PRICE_HIKE"
            badge = "Artificial Hike"
            badge_color = "rose"
            summary = f"Beware: {inflation_evidence} Current discount of {claimed_discount_pct}% is calculated from an artificially inflated price."
        elif real_discount_pct >= 8.0:
            assessment = "GENUINE"
            badge = "Genuine Deal"
            badge_color = "emerald"
            summary = f"Genuine saving: Selling {int(real_discount_pct)}% below the 60-day median price (₹{int(rolling_median):,})."
        elif claimed_discount_pct >= 25.0 and real_discount_pct <= 2.0:
            assessment = "FAKE_INFLATED_MRP"
            badge = "Inflated MRP"
            badge_color = "amber"
            summary = f"Marketing illusion: Store claims {claimed_discount_pct}% off MRP (₹{int(mrp_float):,}), but price is essentially unchanged from the typical ₹{int(rolling_median):,} market price."
        elif real_discount_pct < -4.0:
            assessment = "ABOVE_AVERAGE"
            badge = "Price Above Normal"
            badge_color = "rose"
            summary = f"Higher than normal: Price is {abs(int(real_discount_pct))}% higher than the 60-day median price."
        else:
            assessment = "AVERAGE"
            badge = "Typical Market Price"
            badge_color = "slate"
            summary = f"Normal pricing: Currently trading within standard range of the 60-day rolling median (₹{int(rolling_median):,})."

        return {
            "assessment": assessment,
            "badge": badge,
            "badge_color": badge_color,
            "current_price": int(curr),
            "mrp": int(mrp_float),
            "rolling_median": int(rolling_median),
            "claimed_discount_pct": claimed_discount_pct,
            "real_discount_pct": real_discount_pct,
            "is_inflated": is_inflated,
            "inflation_evidence": inflation_evidence,
            "summary": summary,
        }


deal_intelligence = DealIntelligenceEngine()
