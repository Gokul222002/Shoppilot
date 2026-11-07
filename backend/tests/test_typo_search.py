import os
import json
import pytest
from app.search_engine import search_catalog_fuzzy

CATALOG_PATH = os.path.join(os.path.dirname(__file__), "..", "app", "data", "catalog.json")

@pytest.fixture(scope="module")
def catalog():
    with open(CATALOG_PATH, "r", encoding="utf-8") as f:
        return json.load(f)

def test_typo_relme_returns_realme(catalog):
    results = search_catalog_fuzzy(catalog, "relme")
    assert len(results) > 0, "Expected results for 'relme' typo"
    assert any("Realme" in p["name"] for p in results)
    # The top results should be Realme products
    assert results[0]["brand"] == "Realme"

def test_realme_returns_models(catalog):
    results = search_catalog_fuzzy(catalog, "realme")
    assert len(results) >= 10, f"Expected at least 10 Realme models, got {len(results)}"
    names = [p["name"] for p in results]
    assert any("Narzo" in n for n in names)
    assert any("12 Pro" in n for n in names)
    assert any("GT" in n for n in names)

def test_typo_iphon_15_returns_iphone_15(catalog):
    results = search_catalog_fuzzy(catalog, "iphon 15")
    assert len(results) > 0, "Expected results for 'iphon 15'"
    assert any("iPhone 15" in p["name"] for p in results)

def test_partial_samsung_s24_ultra(catalog):
    results = search_catalog_fuzzy(catalog, "samsung s24 ultra")
    assert len(results) > 0, "Expected results for 'samsung s24 ultra'"
    assert "S24 Ultra" in results[0]["name"]

def test_catalog_size_exceeds_300(catalog):
    assert len(catalog) >= 300, f"Expected >= 300 products, got {len(catalog)}"

def test_categories_count(catalog):
    categories = set(p["category"] for p in catalog)
    assert len(categories) == 8, f"Expected 8 categories, got {categories}"
    expected = {"mobiles", "laptops", "tvs", "headphones", "appliances", "fashion", "grocery", "books"}
    assert categories == expected

def test_barcode_search_direct_match(catalog):
    first_item = catalog[0]
    barcode = first_item.get("barcode")
    assert barcode is not None, "Product must have barcode"
    results = search_catalog_fuzzy(catalog, barcode)
    assert len(results) > 0
    assert results[0]["id"] == first_item["id"]

def test_pasted_amazon_url_search(catalog):
    pasted_url = "https://www.amazon.in/Realme-12-Pro-Plus-5G-Submarine-Blue/dp/B0CX21M98F"
    results = search_catalog_fuzzy(catalog, pasted_url)
    assert len(results) > 0
    assert any("Realme 12 Pro" in p["name"] for p in results)

def test_pasted_flipkart_url_search(catalog):
    pasted_url = "https://www.flipkart.com/apple-iphone-15-black-128-gb/p/itm6ac6485515ae4"
    results = search_catalog_fuzzy(catalog, pasted_url)
    assert len(results) > 0
    assert any("iPhone 15" in p["name"] for p in results)

def test_brand_filter(catalog):
    results = search_catalog_fuzzy(catalog, "", brand="Realme")
    assert len(results) >= 10
    assert all(p["brand"] == "Realme" for p in results)

def test_in_stock_filter(catalog):
    results = search_catalog_fuzzy(catalog, "", in_stock_only=True)
    assert len(results) > 0
    for p in results:
        assert any(o.get("in_stock", True) for o in p["offers"])
