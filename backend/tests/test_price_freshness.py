"""
Unit Tests for Price Freshness Hierarchy & Accuracy Layer (ShopPilot Workstream 6 & 6B)
Validates:
  1. Live API freshness (15 mins window)
  2. Merchant feed freshness (6 hours window)
  3. Community updates (48 hours window)
  4. Admin manual updates (7 days window)
  5. Demo price handling (never expires, excluded from real deal claims)
  6. Expired price warning message and deal claim exclusion
"""

from datetime import datetime, timezone, timedelta
import pytest

from app.connectors.price_freshness import (
    evaluate_price_freshness,
    resolve_best_offer,
    FRESHNESS_WINDOWS,
)


def test_live_price_freshness_within_15_mins():
    now = datetime.now(timezone.utc)
    # Offer updated 10 minutes ago
    ts_10m = (now - timedelta(minutes=10)).isoformat()
    offer = {
        "store": "Amazon.in",
        "price": 43999,
        "mrp": 50499,
        "dataSource": "live",
        "last_updated": ts_10m,
    }

    res = evaluate_price_freshness(offer, current_time=now)
    assert res["is_fresh"] is True
    assert res["is_expired"] is False
    assert res["status"] == "fresh"
    assert res["eligible_for_deal_claim"] is True
    assert res["warning"] is None


def test_live_price_expired_after_15_mins():
    now = datetime.now(timezone.utc)
    # Offer updated 20 minutes ago (> 15m)
    ts_20m = (now - timedelta(minutes=20)).isoformat()
    offer = {
        "store": "Amazon.in",
        "price": 43999,
        "mrp": 50499,
        "dataSource": "live",
        "last_updated": ts_20m,
    }

    res = evaluate_price_freshness(offer, current_time=now)
    assert res["is_fresh"] is False
    assert res["is_expired"] is True
    assert res["status"] == "expired"
    assert res["eligible_for_deal_claim"] is False
    assert res["warning"] == "May have changed, check the store"


def test_feed_price_freshness_6h_window():
    now = datetime.now(timezone.utc)
    # Offer updated 4 hours ago (fresh)
    ts_4h = (now - timedelta(hours=4)).isoformat()
    fresh_offer = {
        "store": "Flipkart",
        "price": 38999,
        "mrp": 45999,
        "dataSource": "feed",
        "last_updated": ts_4h,
    }
    res_fresh = evaluate_price_freshness(fresh_offer, current_time=now)
    assert res_fresh["is_fresh"] is True
    assert res_fresh["is_expired"] is False

    # Offer updated 8 hours ago (expired)
    ts_8h = (now - timedelta(hours=8)).isoformat()
    exp_offer = {
        "store": "Flipkart",
        "price": 38999,
        "mrp": 45999,
        "dataSource": "feed",
        "last_updated": ts_8h,
    }
    res_exp = evaluate_price_freshness(exp_offer, current_time=now)
    assert res_exp["is_fresh"] is False
    assert res_exp["is_expired"] is True
    assert res_exp["warning"] == "May have changed, check the store"


def test_community_and_admin_freshness_windows():
    now = datetime.now(timezone.utc)
    # Community: 24h old is fresh, 50h old is expired
    ts_24h = (now - timedelta(hours=24)).isoformat()
    res_comm = evaluate_price_freshness({"dataSource": "community", "last_updated": ts_24h}, current_time=now)
    assert res_comm["is_fresh"] is True

    ts_50h = (now - timedelta(hours=50)).isoformat()
    res_comm_exp = evaluate_price_freshness({"dataSource": "community", "last_updated": ts_50h}, current_time=now)
    assert res_comm_exp["is_fresh"] is False

    # Admin: 5 days old is fresh, 8 days old is expired
    ts_5d = (now - timedelta(days=5)).isoformat()
    res_admin = evaluate_price_freshness({"dataSource": "admin", "last_updated": ts_5d}, current_time=now)
    assert res_admin["is_fresh"] is True

    ts_8d = (now - timedelta(days=8)).isoformat()
    res_admin_exp = evaluate_price_freshness({"dataSource": "admin", "last_updated": ts_8d}, current_time=now)
    assert res_admin_exp["is_fresh"] is False


def test_demo_prices_never_expire_but_suppress_deal_claims():
    offer = {
        "store": "Croma",
        "price": 19999,
        "mrp": 25999,
        "dataSource": "demo",
        "last_updated": "2024-01-01T00:00:00Z",
    }
    res = evaluate_price_freshness(offer)
    assert res["is_fresh"] is True
    assert res["is_expired"] is False
    assert res["status"] == "demo"
    assert res["eligible_for_deal_claim"] is False


def test_resolve_best_offer_excludes_expired_from_claims():
    now = datetime.now(timezone.utc)
    # Expired offer with lower price vs fresh offer with slightly higher price
    expired_low = {
        "store": "StoreA",
        "price": 10000,
        "dataSource": "live",
        "last_updated": (now - timedelta(minutes=45)).isoformat(),  # Expired
    }
    fresh_higher = {
        "store": "StoreB",
        "price": 10500,
        "dataSource": "live",
        "last_updated": (now - timedelta(minutes=5)).isoformat(),   # Fresh
    }

    best = resolve_best_offer([expired_low, fresh_higher], exclude_expired_from_claims=True)
    assert best["store"] == "StoreB"  # Fresh offer chosen for deal claim!
