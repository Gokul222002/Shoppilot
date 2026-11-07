"""
Price Freshness Hierarchy and Accuracy Layer (ShopPilot Workstream 6 & 6B)
Enforces the multi-tier freshness hierarchy:
  1. live API: fresh within 15 minutes (900 seconds)
  2. merchant feed: fresh within 6 hours (21,600 seconds)
  3. community update: fresh within 48 hours (172,800 seconds)
  4. admin manual: fresh within 7 days (604,800 seconds)
  5. estimate: fresh within 14 days
  6. demo: simulated presentation data (never expires)

Expired prices are flagged, displayed with warning indicators, and excluded from deal claims.
"""

from datetime import datetime, timezone
from typing import Dict, Any, Optional

FRESHNESS_WINDOWS = {
    "live": 15 * 60,            # 15 minutes
    "feed": 6 * 3600,           # 6 hours
    "community": 48 * 3600,     # 48 hours
    "admin": 7 * 86400,         # 7 days
    "estimate": 14 * 86400,     # 14 days
    "demo": float("inf"),       # Demo prices do not expire
}

SOURCE_PRIORITY = {
    "live": 100,
    "feed": 80,
    "community": 60,
    "admin": 50,
    "estimate": 30,
    "demo": 10,
}


def parse_timestamp(ts: Optional[str]) -> Optional[datetime]:
    """Parse ISO or date strings into timezone-aware UTC datetime."""
    if not ts:
        return None
    try:
        # Handle ISO with or without Z
        clean_ts = ts.replace("Z", "+00:00")
        dt = datetime.fromisoformat(clean_ts)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        return None


def evaluate_price_freshness(offer: Dict[str, Any], current_time: Optional[datetime] = None) -> Dict[str, Any]:
    """
    Evaluates whether an offer's price is fresh or expired based on its dataSource.
    Returns:
      {
        "is_fresh": bool,
        "is_expired": bool,
        "status": "fresh" | "expired" | "demo",
        "data_source": str,
        "age_seconds": Optional[float],
        "max_freshness_seconds": float,
        "label": str,
        "warning": Optional[str],
        "eligible_for_deal_claim": bool,
      }
    """
    now = current_time or datetime.now(timezone.utc)
    source = (offer.get("dataSource") or offer.get("data_source") or "demo").lower()
    max_window = FRESHNESS_WINDOWS.get(source, FRESHNESS_WINDOWS["demo"])

    if source == "demo":
        return {
            "is_fresh": True,
            "is_expired": False,
            "status": "demo",
            "data_source": "demo",
            "age_seconds": 0.0,
            "max_freshness_seconds": max_window,
            "label": "Demo price",
            "warning": None,
            "eligible_for_deal_claim": False,  # Demo data excluded from real deal claims
        }

    ts_str = offer.get("last_updated") or offer.get("lastUpdated") or offer.get("updatedAt")
    dt = parse_timestamp(ts_str)

    if not dt:
        # If timestamp is missing on a live/feed offer, consider it unverified
        return {
            "is_fresh": False,
            "is_expired": True,
            "status": "expired",
            "data_source": source,
            "age_seconds": None,
            "max_freshness_seconds": max_window,
            "label": "Expired",
            "warning": "May have changed, check the store",
            "eligible_for_deal_claim": False,
        }

    age_seconds = max(0.0, (now - dt).total_seconds())
    is_expired = age_seconds > max_window

    return {
        "is_fresh": not is_expired,
        "is_expired": is_expired,
        "status": "expired" if is_expired else "fresh",
        "data_source": source,
        "age_seconds": round(age_seconds, 1),
        "max_freshness_seconds": max_window,
        "label": f"Live ({source})" if not is_expired else "Expired",
        "warning": "May have changed, check the store" if is_expired else None,
        "eligible_for_deal_claim": not is_expired,
    }


def resolve_best_offer(offers: list, exclude_expired_from_claims: bool = True) -> Optional[Dict[str, Any]]:
    """
    Ranks offers considering price and freshness hierarchy.
    Fresh live/feed offers take precedence for deal claims over expired or demo offers.
    """
    if not offers:
        return None

    evaluated = []
    for o in offers:
        ev = evaluate_price_freshness(o)
        evaluated.append((o, ev))

    if exclude_expired_from_claims:
        # Try to find best fresh offer first
        fresh_offers = [item for item in evaluated if item[1]["is_fresh"]]
        if fresh_offers:
            # Sort by price ascending
            fresh_offers.sort(key=lambda x: x[0]["price"])
            return fresh_offers[0][0]

    # Fallback to absolute lowest price
    sorted_all = sorted(evaluated, key=lambda x: x[0]["price"])
    return sorted_all[0][0]
