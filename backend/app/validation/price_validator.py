"""
ShopPilot Price Sanity Validator (Workstream 1)
Enforces mathematical, category, and anti-glitch bounds across seeds,
connectors, user reports, and merchant feed uploads.
"""

from typing import Dict, Any, Optional, Tuple, List

# Category floor minimum price thresholds (in INR)
CATEGORY_FLOORS: Dict[str, int] = {
    "mobiles": 3000,
    "laptops": 15000,
    "tvs": 8000,
    "headphones": 400,
    "appliances": 1500,
    "fashion": 199,
    "grocery": 40,
    "books": 99,
}

MAX_DISCOUNT_PERCENT = 60.0  # Max realistic discount against authentic MRP
MIN_FAMILY_MEDIAN_RATIO = 0.25  # Price cannot be below 25% of family median


class PriceValidationError(ValueError):
    """Raised when an offer fails hard price sanity rules."""
    pass


def validate_price_sanity(
    price: float,
    mrp: float,
    category: str,
    family_median: Optional[float] = None,
    allow_flag: bool = False,
) -> Tuple[bool, Optional[str]]:
    """
    Validates price sanity according to strict e-commerce integrity rules:
    1. Floor check: price must be >= category minimum floor.
    2. MRP sanity: MRP must be strictly >= price.
    3. Discount ceiling: discount must not exceed 60% of MRP.
    4. Outlier check: price must not be < 25% of family/category median price.

    Returns:
        (is_valid: bool, reason: Optional[str])
    """
    if price <= 0:
        return False, "Price must be strictly positive"

    if mrp < price:
        return False, f"MRP (₹{mrp:,.0f}) cannot be less than selling price (₹{price:,.0f})"

    # 1. Category Floor Check
    cat_clean = (category or "").lower().strip()
    floor = CATEGORY_FLOORS.get(cat_clean, 50)
    if price < floor:
        return False, f"Price ₹{price:,.0f} is below category floor of ₹{floor:,} for {cat_clean}"

    # 2. Maximum Discount Check
    if mrp > 0:
        discount_pct = ((mrp - price) / mrp) * 100.0
        if discount_pct > MAX_DISCOUNT_PERCENT:
            return False, f"Discount {discount_pct:.1f}% exceeds maximum allowable limit of {MAX_DISCOUNT_PERCENT}% vs MRP"

    # 3. Family Median Outlier Check
    if family_median and family_median > 0:
        min_allowed = family_median * MIN_FAMILY_MEDIAN_RATIO
        if price < min_allowed:
            return False, (
                f"Price ₹{price:,.0f} is suspiciously low (< 25% of family median ₹{family_median:,.0f}, "
                f"min allowed: ₹{min_allowed:,.0f})"
            )

    return True, None


def sanitize_or_reject_offer(
    offer: Dict[str, Any],
    category: str,
    family_median: Optional[float] = None
) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
    """
    Sanitizes an offer dictionary or returns rejection reason.
    Ensures dataSource is present and valid.
    """
    price = float(offer.get("price", 0))
    mrp = float(offer.get("mrp", price))
    
    is_valid, reason = validate_price_sanity(price, mrp, category, family_median)
    if not is_valid:
        return None, reason

    # Enforce standard dataSource
    data_source = offer.get("dataSource") or offer.get("data_source") or "demo"
    valid_sources = {"live", "feed", "community", "admin", "estimate", "demo"}
    if data_source not in valid_sources:
        data_source = "demo"

    sanitized = dict(offer)
    sanitized["price"] = int(price)
    sanitized["mrp"] = int(mrp)
    sanitized["discount_pct"] = round(((mrp - price) / mrp) * 100) if mrp > 0 else 0
    sanitized["dataSource"] = data_source
    sanitized["data_source"] = data_source

    return sanitized, None
