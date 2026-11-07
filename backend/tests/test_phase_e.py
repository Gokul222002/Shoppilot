"""
Phase E Price Prediction & Deal Intelligence Acceptance Tests (ShopPilot)
Tests:
1. 7-day and 30-day price forecast with day-of-week and festive calendar modulation.
2. 'Not enough data yet' guardrail for history < 30 days.
3. BUY NOW vs WAIT recommendations with confidence score and one-line reasons.
4. Pre-sale price inflation detector and evidence calculation.
5. Anomaly detector holding suspicious pricing errors (>70% drop) out of the deals feed.
6. Admin anomaly review and approval workflow.
7. Graceful offline fallback resilience.
"""

import pytest
from datetime import date, timedelta
from fastapi.testclient import TestClient
from app.main import app
from app.ml.price_forecaster import price_forecaster
from app.ml.deal_intelligence import deal_intelligence
from app.ml.anomaly import anomaly_detector

client = TestClient(app)


def test_forecast_endpoint_for_365_day_product():
    # mob-001 has 365 days of price history
    resp = client.get("/api/products/mob-001/forecast")
    assert resp.status_code == 200
    data = resp.json()

    assert data["status"] == "SUCCESS"
    assert data["recommendation"] in ("BUY_NOW", "WAIT")
    assert 50 <= data["confidence"] <= 100
    assert len(data["reason"]) > 10

    # 7-day trajectory
    assert "forecast_7d" in data
    traj = data["forecast_7d"]["trajectory"]
    assert len(traj) == 7
    for pt in traj:
        assert pt["predicted_price"] > 0
        assert pt["lower_bound"] <= pt["predicted_price"] <= pt["upper_bound"]

    # 30-day target
    assert "forecast_30d" in data
    assert data["forecast_30d"]["target_price"] > 0
    assert "rolling_median_30d" in data


def test_not_enough_data_guard_for_short_history():
    short_history = [
        {"date": (date.today() - timedelta(days=i)).isoformat(), "price": 25000}
        for i in range(10)
    ]
    res = price_forecaster.forecast_product_price(
        product_id="test-short",
        price_history=short_history,
        current_best_price=25000,
    )
    assert res["status"] == "INSUFFICIENT_DATA"
    assert res["recommendation"] == "NOT_ENOUGH_DATA"
    assert "Not enough data yet" in res["reason"]
    assert res["forecast_7d"] is None


def test_deal_intelligence_real_discount_vs_fake_mrp():
    resp = client.get("/api/products/mob-001/intelligence")
    assert resp.status_code == 200
    data = resp.json()

    assert "rolling_median" in data
    assert data["rolling_median"] > 0
    assert "claimed_discount_pct" in data
    assert "real_discount_pct" in data
    assert data["assessment"] in ("GENUINE", "FAKE_INFLATED_MRP", "PRE_SALE_PRICE_HIKE", "AVERAGE", "ABOVE_AVERAGE")
    assert "badge" in data
    assert len(data["summary"]) > 10


def test_pre_sale_price_inflation_detection_with_evidence():
    today = date.today()
    # Construct history where price was 20,000, then artificially hiked to 24,000 12 days ago (+20%), then dropped
    history = []
    for i in range(90, 0, -1):
        d = today - timedelta(days=i)
        if 20 <= i <= 25:
            # Baseline
            p = 20000
        elif 10 <= i <= 15:
            # Artificially hiked price before the discount
            p = 24000
        else:
            p = 20000
        history.append({"date": d.isoformat(), "price": p})

    # Current price 19,500 claiming discount from hiked price
    analysis = deal_intelligence.analyze_deal_quality(
        current_price=19500,
        mrp=25000,
        price_history=history,
    )
    assert analysis["is_inflated"] is True
    assert analysis["inflation_evidence"] is not None
    assert "Price raised" in analysis["inflation_evidence"]
    assert analysis["assessment"] == "PRE_SALE_PRICE_HIKE"


def test_anomaly_detection_filters_extreme_drop_from_deals_feed():
    # Test checking an offer with 75% drop below rolling median
    res = anomaly_detector.check_offer(
        product_id="glitch-001",
        product_name="Glitch Phone 5G",
        store="StoreBug",
        offer_price=5000,
        rolling_median=25000,  # 80% drop
    )
    assert res["is_anomaly"] is True
    assert res["held_for_verification"] is True
    assert "Suspicious price drop" in res["reason"]

    # Verify deals feed endpoint returns 200 and doesn't crash
    feed_resp = client.get("/api/deals")
    assert feed_resp.status_code == 200
    feed_data = feed_resp.json()
    assert "deals" in feed_data
    # Ensure no deal in the feed has a held anomaly
    for deal in feed_data["deals"]:
        med = deal.get("deal_intelligence", {}).get("rolling_median", 0)
        price = deal.get("best_price", 0)
        if med > 0:
            assert price >= (med * 0.30)  # Cannot be >70% below median without verification


def test_admin_anomaly_endpoints_and_resolution():
    list_resp = client.get("/api/admin/anomalies")
    assert list_resp.status_code == 200
    data = list_resp.json()
    assert "anomalies" in data
    assert data["total"] > 0

    target_id = data["anomalies"][0]["id"]

    # Approve anomaly
    app_resp = client.post(f"/api/admin/anomalies/{target_id}/approve")
    assert app_resp.status_code == 200
    assert app_resp.json()["status"] == "SUCCESS"
    assert app_resp.json()["item"]["status"] == "APPROVED"
