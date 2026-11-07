import pytest
from app.validation.price_validator import (
    validate_price_sanity,
    sanitize_or_reject_offer,
    CATEGORY_FLOORS,
    MAX_DISCOUNT_PERCENT,
)

def test_category_floor_rejects_sub_floor_mobile():
    """Verify phone under ₹3,000 is rejected (e.g. iPhone at ₹999)."""
    valid, reason = validate_price_sanity(price=999, mrp=79900, category="mobiles")
    assert not valid
    assert "below category floor" in reason.lower()

    valid, reason = validate_price_sanity(price=2500, mrp=5000, category="mobiles")
    assert not valid


def test_category_floor_respects_laptop_and_tv_floors():
    """Verify laptops < ₹15,000 and TVs < ₹8,000 are rejected."""
    valid, _ = validate_price_sanity(price=12000, mrp=25000, category="laptops")
    assert not valid

    valid, _ = validate_price_sanity(price=6000, mrp=15000, category="tvs")
    assert not valid


def test_max_discount_rejection():
    """Verify discounts exceeding 60% vs authentic MRP are rejected (e.g. -67% glitch)."""
    # 67% discount on 5099 MRP -> price 1682
    valid, reason = validate_price_sanity(price=1682, mrp=5099, category="headphones")
    assert not valid
    assert "exceeds maximum allowable limit of 60" in reason.lower()

    # 40% discount -> valid
    valid, _ = validate_price_sanity(price=2999, mrp=4999, category="headphones")
    assert valid


def test_mrp_below_price_rejected():
    """Verify MRP lower than price is rejected."""
    valid, reason = validate_price_sanity(price=35000, mrp=32000, category="mobiles")
    assert not valid
    assert "cannot be less than selling price" in reason.lower()


def test_family_median_outlier_rejection():
    """Verify an offer priced < 25% of family median is rejected as a glitch."""
    # Realme GT 6 family median is around ₹42,000. Price of ₹8,000 against a reduced MRP of ₹15,000
    # Discount is 46.7% (passes discount check), but price ₹8,000 is < 25% of median (₹10,500)
    valid, reason = validate_price_sanity(
        price=8000,
        mrp=15000,
        category="mobiles",
        family_median=42000
    )
    assert not valid
    assert "suspiciously low" in reason.lower()


def test_valid_realistic_prices_accepted():
    """Verify authentic market prices pass sanity validation."""
    # Realme GT 6 (Fluid Silver, 256GB, 12GB RAM)
    valid, reason = validate_price_sanity(
        price=39999,
        mrp=44999,
        category="mobiles",
        family_median=41000
    )
    assert valid
    assert reason is None

    # boAt Rockerz 550 (₹1,999 vs ₹4,499 MRP -> 55.5% discount)
    valid, reason = validate_price_sanity(
        price=1999,
        mrp=4499,
        category="headphones",
        family_median=1999
    )
    assert valid
    assert reason is None


def test_sanitize_or_reject_offer_attaches_datasource():
    """Verify sanitize_or_reject_offer attaches dataSource and normalizes offer."""
    offer = {
        "store": "Amazon.in",
        "price": 40999,
        "mrp": 44999,
    }
    sanitized, reason = sanitize_or_reject_offer(offer, category="mobiles", family_median=41000)
    assert reason is None
    assert sanitized is not None
    assert sanitized["dataSource"] == "demo"
    assert sanitized["discount_pct"] == 9
