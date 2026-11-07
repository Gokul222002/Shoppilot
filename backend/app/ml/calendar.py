"""
Configurable Indian E-Commerce Sale Event Calendar (ShopPilot Phase E)
Tracks major festive sale periods across Amazon.in (Great Indian Festival),
Flipkart (Big Billion Days), Independence Day Sales, Republic Day Sales,
Diwali Mega Sales, and End of Season Sales (EOSS).
"""

from datetime import date, datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple


class ShoppingSaleEvent:
    def __init__(
        self,
        name: str,
        start_month: int,
        start_day: int,
        duration_days: int,
        avg_discount_pct: float,
        applicable_categories: Optional[List[str]] = None,
    ):
        self.name = name
        self.start_month = start_month
        self.start_day = start_day
        self.duration_days = duration_days
        self.avg_discount_pct = avg_discount_pct
        self.applicable_categories = applicable_categories or []

    def get_dates_for_year(self, year: int) -> Tuple[date, date]:
        start = date(year, self.start_month, self.start_day)
        end = start + timedelta(days=self.duration_days)
        return start, end


# Configurable Calendar of Major Annual Shopping Events in India
INDIAN_SALE_CALENDAR: List[ShoppingSaleEvent] = [
    ShoppingSaleEvent(
        name="Great Republic Day Sale",
        start_month=1,
        start_day=15,
        duration_days=11,
        avg_discount_pct=14.0,
        applicable_categories=["mobiles", "laptops", "tvs", "appliances", "fashion"],
    ),
    ShoppingSaleEvent(
        name="Summer Appliance & AC Festival",
        start_month=5,
        start_day=1,
        duration_days=10,
        avg_discount_pct=16.0,
        applicable_categories=["appliances", "tvs"],
    ),
    ShoppingSaleEvent(
        name="Independence Day / Great Freedom Festival",
        start_month=8,
        start_day=5,
        duration_days=10,
        avg_discount_pct=15.0,
        applicable_categories=["mobiles", "laptops", "headphones", "fashion", "appliances"],
    ),
    ShoppingSaleEvent(
        name="Flipkart Big Billion Days & Amazon Great Indian Festival",
        start_month=9,
        start_day=26,
        duration_days=14,
        avg_discount_pct=22.0,
        applicable_categories=["mobiles", "laptops", "tvs", "headphones", "appliances", "fashion", "grocery", "books"],
    ),
    ShoppingSaleEvent(
        name="Diwali Mega Dhamaka Sale",
        start_month=10,
        start_day=24,
        duration_days=12,
        avg_discount_pct=20.0,
        applicable_categories=["mobiles", "laptops", "tvs", "appliances", "fashion"],
    ),
    ShoppingSaleEvent(
        name="Year-End Clearance & Christmas EOSS",
        start_month=12,
        start_day=20,
        duration_days=12,
        avg_discount_pct=15.0,
        applicable_categories=["fashion", "headphones", "appliances", "laptops"],
    ),
]


class EventCalendarManager:
    def __init__(self, events: Optional[List[ShoppingSaleEvent]] = None):
        self.events = events or INDIAN_SALE_CALENDAR

    def is_in_sale_period(self, target_date: date) -> Tuple[bool, Optional[str], float]:
        """
        Determines whether the given date falls into an active festival sale.
        Returns: (is_active, event_name, expected_discount_pct)
        """
        for event in self.events:
            start, end = event.get_dates_for_year(target_date.year)
            if start <= target_date <= end:
                return True, event.name, event.avg_discount_pct
        return False, None, 0.0

    def get_upcoming_sale(self, ref_date: Optional[date] = None) -> Optional[Dict[str, Any]]:
        """
        Finds the nearest upcoming major sale event from the reference date.
        """
        today = ref_date or date.today()
        candidates = []

        for year in (today.year, today.year + 1):
            for event in self.events:
                start, end = event.get_dates_for_year(year)
                if start >= today:
                    days_away = (start - today).days
                    candidates.append({
                        "name": event.name,
                        "start_date": start.isoformat(),
                        "end_date": end.isoformat(),
                        "days_away": days_away,
                        "avg_discount_pct": event.avg_discount_pct,
                        "categories": event.applicable_categories,
                    })

        if not candidates:
            return None

        candidates.sort(key=lambda x: x["days_away"])
        return candidates[0]


sale_calendar = EventCalendarManager()
