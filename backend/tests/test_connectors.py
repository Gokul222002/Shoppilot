import pytest
from app.connectors.base import StoreConnector
from app.connectors.mock import MockStoreConnector
from app.connectors.amazon import AmazonCreatorsConnector, AmazonPAAPIConnector
from app.connectors.flipkart import FlipkartAffiliateConnector
from app.connectors.feed_importer import MerchantFeedConnector
from app.connectors.registry import connector_registry
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_mock_store_connector_interface():
    mock = MockStoreConnector()
    assert isinstance(mock, StoreConnector)
    assert mock.name == "MockConnector"

    # search method
    results = mock.search("realme")
    assert len(results) > 0
    assert any("Realme" in p["name"] for p in results)

    # get_product method
    prod = mock.get_product("mob-001")
    assert prod is not None
    assert prod["id"] == "mob-001"

    # get_offers method
    offers = mock.get_offers("mob-001")
    assert len(offers) > 0
    assert any(o["store"] == "Amazon.in" for o in offers)

def test_amazon_creators_connector_graceful_fallback():
    amazon = AmazonCreatorsConnector()
    assert isinstance(amazon, StoreConnector)
    assert amazon.name in ("AmazonCreatorsConnector", "AmazonPAAPIConnector")

    # Without keys, is_configured should be false
    assert not amazon.is_configured

    # Must never throw errors and fall back cleanly to mock
    results = amazon.search("iphone 15")
    assert len(results) > 0
    assert any("iPhone 15" in p["name"] for p in results)

    prod = amazon.get_product("mob-001")
    assert prod is not None

    offers = amazon.get_offers("mob-001")
    assert len(offers) > 0

    # Token request without credentials returns None without crashing
    assert amazon.get_access_token() is None

def test_flipkart_affiliate_connector_graceful_fallback():
    flipkart = FlipkartAffiliateConnector()
    assert isinstance(flipkart, StoreConnector)
    assert flipkart.name == "FlipkartAffiliateConnector"
    assert not flipkart.is_configured

    results = flipkart.search("samsung")
    assert len(results) > 0
    assert any("Samsung" in p["name"] for p in results)

def test_merchant_feed_connector_graceful_fallback():
    feed = MerchantFeedConnector()
    assert isinstance(feed, StoreConnector)
    assert feed.name == "MerchantFeedConnector"

    results = feed.search("laptop")
    assert len(results) > 0

def test_merchant_feed_xml_and_sanity_validation():
    feed = MerchantFeedConnector()
    # XML feed with 1 valid offer and 1 price-insane glitch offer (iPhone 15 at ₹500)
    sample_xml = """<?xml version="1.0" encoding="UTF-8"?>
    <products>
        <item>
            <title>Realme GT 6 (Fluid Silver, 256GB, 12GB RAM)</title>
            <store>Tata CLiQ</store>
            <price>39999</price>
            <mrp>45999</mrp>
            <url>https://www.tatacliq.com/p-12345</url>
        </item>
        <item>
            <title>Apple iPhone 15 Pro Max (Natural Titanium, 256GB)</title>
            <store>GlitchStore</store>
            <price>500</price>
            <mrp>161499</mrp>
            <url>https://fake.deal/iphone</url>
        </item>
    </products>
    """
    res = feed.parse_and_merge_xml(sample_xml)
    assert res["status"] == "SUCCESS"
    assert res["rows_read"] == 2
    # Only the valid Realme offer should be merged; the ₹500 iPhone offer MUST be rejected by price sanity validator
    assert res["offers_merged"] == 1

def test_connector_registry_orchestration(monkeypatch):
    assert connector_registry.use_mock is True
    active = connector_registry.get_active_connector()
    assert isinstance(active, MockStoreConnector)

    connectors = connector_registry.list_connectors()
    assert len(connectors) == 4
    keys = [c["key"] for c in connectors]
    assert "mock" in keys
    assert "amazon" in keys
    assert "flipkart" in keys
    assert "feed" in keys

def test_api_connectors_endpoint():
    resp = client.get("/api/connectors")
    assert resp.status_code == 200
    data = resp.json()
    assert data["use_mock_data"] is True
    assert data["active_connector"] == "MockConnector"
    assert len(data["connectors"]) == 4
