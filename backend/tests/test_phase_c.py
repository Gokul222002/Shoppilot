"""
Phase C Comprehensive Acceptance Tests (ShopPilot)
Tests:
1. Sample CSV feed imports and merges offers into canonical products.
2. Store disabling removes its offers from search/compare; store enabling restores them.
3. Connector failures display gracefully in admin telemetry without breaking user pages.
4. Pipeline scheduler records PricePoints on price change and skips unchanged prices.
5. Affiliate link builder creates tagged links and click-out endpoint logs clicks.
6. Multi-currency ready (INR default, USD, EUR conversions).
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.connectors.registry import connector_registry
from app.connectors.scheduler import price_scheduler
from app.connectors.affiliate import affiliate_builder
from app.connectors.utils import convert_price

client = TestClient(app)


def test_merchant_feed_csv_parse_and_merge():
    sample_csv = (
        "product_id,barcode,product_name,store,price,mrp,delivery_days,seller_rating,in_stock,shipping_fee,region,currency,url\n"
        "mob-001,890100000001,Realme 12 Pro 5G (Submarine Blue 256GB),Tata CLiQ,22499,29999,2,4.6,true,0,IN,INR,https://www.tatacliq.com/realme-12-pro\n"
    )
    resp = client.post("/api/admin/feed/upload", json={"feed_csv": sample_csv})
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "SUCCESS"
    assert data["offers_merged"] >= 1

    # Verify product mob-001 now has Tata CLiQ offer
    prod_resp = client.get("/api/products/mob-001")
    assert prod_resp.status_code == 200
    prod_data = prod_resp.json()
    stores = [o["store"] for o in prod_data["offers"]]
    assert "Tata CLiQ" in stores
    tata_offer = next(o for o in prod_data["offers"] if o["store"] == "Tata CLiQ")
    assert tata_offer["price"] == 22499


def test_store_disabling_removes_offers():
    # Ensure Tata CLiQ is present first
    prod_before = client.get("/api/products/mob-001").json()
    stores_before = [o["store"] for o in prod_before["offers"]]
    assert "Tata CLiQ" in stores_before

    # Disable Tata CLiQ
    toggle_resp = client.post("/api/admin/stores/toggle", json={"store": "Tata CLiQ", "enabled": False})
    assert toggle_resp.status_code == 200
    assert "Tata CLiQ" in toggle_resp.json()["disabled_stores"]

    # Verify product no longer presents Tata CLiQ offer
    prod_after = client.get("/api/products/mob-001").json()
    stores_after = [o["store"] for o in prod_after["offers"]]
    assert "Tata CLiQ" not in stores_after

    # Re-enable Tata CLiQ
    re_enable = client.post("/api/admin/stores/toggle", json={"store": "Tata CLiQ", "enabled": True})
    assert re_enable.status_code == 200
    assert "Tata CLiQ" not in re_enable.json()["disabled_stores"]

    # Verify Tata CLiQ is restored
    prod_restored = client.get("/api/products/mob-001").json()
    stores_restored = [o["store"] for o in prod_restored["offers"]]
    assert "Tata CLiQ" in stores_restored


def test_connector_failure_shows_in_admin_without_crashing_pages():
    # Trigger simulated failure on Amazon PA-API
    fail_resp = client.post("/api/admin/connectors/amazon/trigger-sync", json={"simulate_failure": True})
    assert fail_resp.status_code == 200
    assert fail_resp.json()["status"] == "ERROR"

    # Verify admin sync status endpoint shows the error cleanly
    status_resp = client.get("/api/admin/sync-status")
    assert status_resp.status_code == 200
    summary = status_resp.json()["summary"]
    assert summary["amazon"]["status"] == "ERROR"
    assert "RateLimitExceeded" in summary["amazon"]["error"]

    # Verify that public user-facing search and product pages STILL WORK seamlessly without 500 error
    search_resp = client.get("/api/search?q=realme")
    assert search_resp.status_code == 200
    assert search_resp.json()["total"] > 0

    prod_resp = client.get("/api/products/mob-001")
    assert prod_resp.status_code == 200

    # Reset connector status to healthy
    reset_resp = client.post("/api/admin/connectors/amazon/trigger-sync", json={"simulate_failure": False})
    assert reset_resp.status_code == 200


def test_pipeline_scheduler_price_points_and_skipping():
    # Run initial cycle
    init_run = client.post("/api/admin/scheduler/run", json={"tier": "tier1", "shift_sample_price": False})
    assert init_run.status_code == 200
    init_summary = init_run.json()
    first_recorded = init_summary["price_points_recorded"]
    assert first_recorded > 0

    # Run second cycle immediately with unchanged prices
    second_run = client.post("/api/admin/scheduler/run", json={"tier": "tier1", "shift_sample_price": False})
    assert second_run.status_code == 200
    second_summary = second_run.json()
    # Unchanged prices should be skipped!
    assert second_summary["price_points_recorded"] == 0
    assert second_summary["unchanged_skipped"] > 0

    # Run third cycle simulating price drop on mob-001
    shift_run = client.post("/api/admin/scheduler/run", json={"tier": "tier1", "shift_sample_price": True})
    assert shift_run.status_code == 200
    shift_summary = shift_run.json()
    # Should record newly changed price
    assert shift_summary["price_points_recorded"] > 0


def test_affiliate_builder_and_click_tracking():
    amz_link = affiliate_builder.build_affiliate_url("https://www.amazon.in/dp/B0CX123", "Amazon", subid="mob-001")
    assert "tag=" in amz_link

    fk_link = affiliate_builder.build_affiliate_url("https://www.flipkart.com/p/item", "Flipkart", subid="mob-001")
    assert "affid=" in fk_link

    # Test click logging API
    click_resp = client.post("/api/affiliate/click", json={
        "store": "Amazon",
        "product_id": "mob-001",
        "product_name": "Realme 12 Pro 5G",
        "url": "https://www.amazon.in/dp/B0CX123",
    })
    assert click_resp.status_code == 200
    assert click_resp.json()["status"] == "LOGGED"
    assert "tag=" in click_resp.json()["affiliate_url"]

    # Check click list
    list_resp = client.get("/api/affiliate/clicks")
    assert list_resp.status_code == 200
    assert list_resp.json()["total_clicks"] >= 1


def test_multi_currency_conversion():
    prod_inr = client.get("/api/products/mob-001?currency=INR").json()
    assert prod_inr["best_price"] > 0

    prod_usd = client.get("/api/products/mob-001?currency=USD").json()
    assert "best_price_converted" in prod_usd
    assert prod_usd["best_price_converted"]["currency"] == "USD"
    assert prod_usd["best_price_converted"]["symbol"] == "$"
    assert prod_usd["best_price_converted"]["amount"] > 0

    prod_eur = client.get("/api/products/mob-001?currency=EUR").json()
    assert "best_price_converted" in prod_eur
    assert prod_eur["best_price_converted"]["currency"] == "EUR"
    assert prod_eur["best_price_converted"]["symbol"] == "€"
