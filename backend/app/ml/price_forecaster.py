"""
Price Prediction & Forecaster Engine (ShopPilot Phase E)
Generates 7-day and 30-day price trajectories using historical price points,
seasonality/festival event calendars, rolling statistical metrics, and day-of-week signals.
Provides 'BUY NOW' vs 'WAIT' recommendation with confidence score and one-line reasoning.
Includes guardrail: returns 'Not enough data yet' if history < 30 days.
"""

import math
import logging
from datetime import date, datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple

from app.ml.calendar import sale_calendar

logger = logging.getLogger("ShopPilot.ML.Forecaster")


def compute_median(values: List[float]) -> float:
    if not values:
        return 0.0
    s = sorted(values)
    n = len(s)
    mid = n // 2
    if n % 2 == 1:
        return float(s[mid])
    return (s[mid - 1] + s[mid]) / 2.0


class PriceForecaster:
    def __init__(self, min_history_days: int = 30):
        self.min_history_days = min_history_days

    def forecast_product_price(
        self,
        product_id: str,
        price_history: List[Dict[str, Any]],
        current_best_price: Optional[int] = None,
        category: Optional[str] = None,
        ref_date: Optional[date] = None,
    ) -> Dict[str, Any]:
        """
        Generates 7-day and 30-day price forecasts and actionable recommendation.
        Returns 'Not enough data yet' if fewer than 30 days of history exist.
        """
        today = ref_date or date.today()

        # Guard: Require at least 30 days of history
        if not price_history or len(price_history) < self.min_history_days:
            return {
                "product_id": product_id,
                "status": "INSUFFICIENT_DATA",
                "days_available": len(price_history) if price_history else 0,
                "recommendation": "NOT_ENOUGH_DATA",
                "confidence": 0,
                "reason": "Not enough data yet. Requires at least 30 days of historical price tracking.",
                "forecast_7d": None,
                "forecast_30d": None,
                "rolling_median_30d": None,
                "all_time_low": None,
                "all_time_high": None,
            }

        # Parse and sort historical points by date
        parsed_points: List[Tuple[date, float]] = []
        for pt in price_history:
            try:
                d_str = pt.get("date", "")
                p_val = float(pt.get("price", 0))
                if d_str and p_val > 0:
                    d_obj = datetime.strptime(d_str[:10], "%Y-%m-%d").date()
                    parsed_points.append((d_obj, p_val))
            except Exception:
                continue

        parsed_points.sort(key=lambda x: x[0])
        if len(parsed_points) < self.min_history_days:
            return {
                "product_id": product_id,
                "status": "INSUFFICIENT_DATA",
                "days_available": len(parsed_points),
                "recommendation": "NOT_ENOUGH_DATA",
                "confidence": 0,
                "reason": "Not enough data yet. Requires at least 30 days of historical price tracking.",
                "forecast_7d": None,
                "forecast_30d": None,
                "rolling_median_30d": None,
                "all_time_low": None,
                "all_time_high": None,
            }

        all_prices = [p for _, p in parsed_points]
        curr_price = float(current_best_price) if current_best_price else all_prices[-1]

        # 30-day and 14-day rolling statistics
        recent_30 = all_prices[-30:]
        recent_14 = all_prices[-14:]
        recent_7 = all_prices[-7:]

        median_30 = compute_median(recent_30)
        mean_30 = sum(recent_30) / len(recent_30)
        mean_7 = sum(recent_7) / len(recent_7)
        all_time_low = min(all_prices)
        all_time_high = max(all_prices)

        # Day-of-week historical deviation (weekend vs weekday effects)
        dow_deltas: Dict[int, List[float]] = {i: [] for i in range(7)}
        for d, p in parsed_points[-90:]:
            dow_deltas[d.weekday()].append(p / median_30)

        dow_multipliers = {
            dow: (sum(ratios) / len(ratios) if ratios else 1.0)
            for dow, ratios in dow_deltas.items()
        }

        # Linear trend estimation over last 14 days
        n14 = len(recent_14)
        x_vals = list(range(n14))
        y_vals = recent_14
        x_mean = sum(x_vals) / n14
        y_mean = sum(y_vals) / n14
        cov = sum((x - x_mean) * (y - y_mean) for x, y in zip(x_vals, y_vals))
        var = sum((x - x_mean) ** 2 for x in x_vals)
        daily_trend_slope = (cov / var) if var != 0 else 0.0

        # Event calendar upcoming sale proximity
        upcoming_sale = sale_calendar.get_upcoming_sale(ref_date=today)
        sale_name = upcoming_sale["name"] if upcoming_sale else None
        sale_days = upcoming_sale["days_away"] if upcoming_sale else 999
        sale_discount_pct = (upcoming_sale["avg_discount_pct"] / 100.0) if upcoming_sale else 0.0

        # Category relevance check
        category_matches_sale = True
        if upcoming_sale and category and upcoming_sale.get("categories"):
            category_matches_sale = category.lower() in [c.lower() for c in upcoming_sale["categories"]]

        # ─── Generate 7-Day Day-by-Day Forecast ──────────────────────────────
        trajectory_7d: List[Dict[str, Any]] = []
        for step in range(1, 8):
            step_date = today + timedelta(days=step)
            dow = step_date.weekday()
            dow_factor = dow_multipliers.get(dow, 1.0)

            # Trend projection anchored on persistence with dampening
            trend_proj = curr_price + (daily_trend_slope * 0.15 * step)
            reversion_weight = min(0.08, 0.01 * step)
            base_pred = (1 - reversion_weight) * trend_proj + reversion_weight * median_30

            # Day of week adjustment
            adj_pred = base_pred * dow_factor

            # Sale dip impact if the sale starts within the step window
            if category_matches_sale and upcoming_sale and sale_days <= step <= (sale_days + 10):
                adj_pred = adj_pred * (1.0 - sale_discount_pct * 0.85)

            # Bound between historical low and high with buffer
            bounded_pred = max(all_time_low * 0.85, min(all_time_high * 1.05, adj_pred))
            rounded_pred = round(bounded_pred)

            trajectory_7d.append({
                "day": step,
                "date": step_date.isoformat(),
                "predicted_price": rounded_pred,
                "lower_bound": round(rounded_pred * 0.96),
                "upper_bound": round(rounded_pred * 1.04),
            })

        forecast_7d_target = trajectory_7d[-1]["predicted_price"]

        # ─── Generate 30-Day Long-Range Forecast ─────────────────────────────
        target_date_30d = today + timedelta(days=30)
        long_pred = (curr_price * 0.4) + (median_30 * 0.6)

        if category_matches_sale and upcoming_sale and sale_days <= 30:
            # Sale occurs during the 30-day horizon
            long_pred = median_30 * (1.0 - sale_discount_pct * 0.75)

        bounded_30d = max(all_time_low * 0.85, min(all_time_high * 1.05, long_pred))
        forecast_30d_target = round(bounded_30d)

        # ─── Decision Logic: BUY NOW vs WAIT ─────────────────────────────────
        price_ratio_to_median = curr_price / median_30 if median_30 > 0 else 1.0
        predicted_7d_ratio = forecast_7d_target / curr_price if curr_price > 0 else 1.0

        recommendation = "BUY_NOW"
        confidence = 80
        reason = ""

        # Condition 1: Major festival sale starts within 14 days
        if category_matches_sale and upcoming_sale and 0 < sale_days <= 14:
            expected_saving_pct = round(sale_discount_pct * 100)
            if price_ratio_to_median >= 0.94:
                recommendation = "WAIT"
                confidence = 88
                reason = f"{sale_name} begins in {sale_days} days. Wait for expected ~{expected_saving_pct}% festival price drop."
            else:
                recommendation = "BUY_NOW"
                confidence = 85
                reason = f"Price is already discounted (₹{int(curr_price):,} vs median ₹{int(median_30):,}) ahead of {sale_name}. Safe to buy now."

        # Condition 2: Current price is near all-time low (within 3%)
        elif curr_price <= all_time_low * 1.03:
            recommendation = "BUY_NOW"
            confidence = 94
            reason = f"Current price of ₹{int(curr_price):,} is at an all-time low (lowest in 12 months). High probability of rebound."

        # Condition 3: Substantial discount below 30-day rolling median (>8%)
        elif price_ratio_to_median <= 0.92:
            discount_pct = round((1.0 - price_ratio_to_median) * 100)
            recommendation = "BUY_NOW"
            confidence = 89
            reason = f"Selling {discount_pct}% below the 30-day rolling median (₹{int(median_30):,}). Excellent value to purchase today."

        # Condition 4: Current price is inflated above 30-day median (>5%)
        elif price_ratio_to_median >= 1.05:
            recommendation = "WAIT"
            confidence = 82
            inflation_pct = round((price_ratio_to_median - 1.0) * 100)
            reason = f"Price is currently inflated {inflation_pct}% above the 30-day median (₹{int(median_30):,}). Wait for normalization."

        # Condition 5: Predicted 7-day drop > 4%
        elif predicted_7d_ratio <= 0.96:
            drop_pct = round((1.0 - predicted_7d_ratio) * 100)
            recommendation = "WAIT"
            confidence = 78
            reason = f"Forecast projects a {drop_pct}% price drop over the next 7 days down to ~₹{forecast_7d_target:,}."

        # Default: Price is stable near rolling median
        else:
            recommendation = "BUY_NOW"
            confidence = 75
            reason = f"Price is stable near the 30-day rolling median (₹{int(median_30):,}) with low volatility."

        return {
            "product_id": product_id,
            "status": "SUCCESS",
            "current_price": int(curr_price),
            "rolling_median_30d": int(median_30),
            "rolling_mean_30d": int(mean_30),
            "all_time_low": int(all_time_low),
            "all_time_high": int(all_time_high),
            "recommendation": recommendation,
            "confidence": confidence,
            "reason": reason,
            "forecast_7d": {
                "target_price": forecast_7d_target,
                "change_pct": round(((forecast_7d_target - curr_price) / curr_price) * 100, 1),
                "trajectory": trajectory_7d,
            },
            "forecast_30d": {
                "target_price": forecast_30d_target,
                "change_pct": round(((forecast_30d_target - curr_price) / curr_price) * 100, 1),
            },
            "upcoming_sale": upcoming_sale,
        }


price_forecaster = PriceForecaster()
