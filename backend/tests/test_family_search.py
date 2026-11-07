"""
Unit Tests for Product Family Search & Ranking (Workstream 2 & Defect D2 Acceptance)
Verifies:
- 'realme gt6' ranks Realme GT 6 family variants at the top (not random Realme models)
- 'relme gt6' typo returns Realme GT 6
- 'gt6 price' returns Realme GT 6 variants
- 'realme gt 6 256gb' ranks the 256GB variant first
- iPhone 15 search returns Apple iPhone 15 models with realistic prices
"""

import json
import os
import pytest
from app.search_engine import search_catalog_fuzzy

CATALOG_PATH = os.path.join(os.path.dirname(__file__), "..", "app", "data", "catalog.json")


@pytest.fixture(scope="module")
def catalog():
    with open(CATALOG_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def test_realme_gt6_ranking(catalog):
    """Defect D2 Test: 'realme gt6' must return Realme GT 6 family at the top."""
    results = search_catalog_fuzzy(catalog, "realme gt6")
    assert len(results) > 0

    top_result = results[0]
    assert "Realme GT 6" in top_result["name"]
    assert top_result["familyName"] == "Realme GT 6"
    assert "GT 6" in top_result["name"]

    # All top results before unrelated models must be GT 6 or GT 6T
    top_5_names = [p["name"] for p in results[:5]]
    for name in top_5_names[:3]:
        assert "GT 6" in name, f"Expected GT 6 in top results, got: {name}"


def test_relme_gt6_typo(catalog):
    """Typo 'relme gt6' must resolve to Realme GT 6."""
    results = search_catalog_fuzzy(catalog, "relme gt6")
    assert len(results) > 0
    assert "Realme GT 6" in results[0]["name"]


def test_gt6_price_noise_removal(catalog):
    """'gt6 price' must strip noise word and match Realme GT 6."""
    results = search_catalog_fuzzy(catalog, "gt6 price")
    assert len(results) > 0
    assert "GT 6" in results[0]["name"]


def test_realme_gt6_256gb_attribute_boost(catalog):
    """'realme gt 6 256gb' must boost 256GB storage variant to the top."""
    results = search_catalog_fuzzy(catalog, "realme gt 6 256gb")
    assert len(results) > 0
    top = results[0]
    assert "GT 6" in top["name"]
    assert "256GB" in top["name"]


def test_iphone_15_family_search(catalog):
    """'iphon 15' must return iPhone 15 family variants."""
    results = search_catalog_fuzzy(catalog, "iphon 15")
    assert len(results) > 0
    top = results[0]
    assert "iPhone 15" in top["name"]
    # Check that price is realistic, not ₹999
    best_price = min(o["price"] for o in top["offers"])
    assert best_price > 50000, f"Expected realistic iPhone 15 price, got: ₹{best_price}"


def test_boat_rockerz_550_search(catalog):
    """'boAt Rockerz 550' must return boAt headphone with realistic discount <= 60%."""
    results = search_catalog_fuzzy(catalog, "boAt Rockerz 550")
    assert len(results) > 0
    top = results[0]
    assert "boAt Rockerz 550" in top["name"]
    for offer in top["offers"]:
        assert offer["discount_pct"] <= 60.0
        assert offer["dataSource"] == "demo"
