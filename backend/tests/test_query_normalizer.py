"""
Unit Tests for Query Normalization and Product Title Parser (Workstream 2)
"""

import pytest
from app.utils.query_normalizer import normalize_query, parse_product_title, split_letter_digit_joins


def test_split_letter_digit_joins():
    assert "gt 6" in split_letter_digit_joins("gt6")
    assert "s 24 ultra" in split_letter_digit_joins("s24ultra")
    assert "c 55" in split_letter_digit_joins("c55")
    # Storage and RAM should be protected
    res = split_letter_digit_joins("gt6 256gb 12gb ram")
    assert "256gb" in res
    assert "12gb ram" in res
    assert "gt 6" in res


def test_normalize_query_typos_and_noise():
    # Defect D2 & D5 cases
    assert normalize_query("realme gt6") == "realme gt 6"
    assert normalize_query("relme gt6") == "realme gt 6"
    assert normalize_query("real me gt 6") == "realme gt 6"
    assert normalize_query("gt6 price") == "gt 6"
    assert normalize_query("buy realme gt 6 online") == "realme gt 6"
    assert normalize_query("iphon 15") == "iphone 15"
    assert normalize_query("i phone 15 pro max") == "iphone 15 pro max"
    assert normalize_query("samsung s24ultra price") == "samsung s 24 ultra"


def test_parse_product_title_realme_gt6():
    # Defect D4 case: Realme GT 6 (Fluid Silver, 256GB, 12GB RAM)
    parsed = parse_product_title("Realme GT 6 (Fluid Silver, 256GB, 12GB RAM)")
    assert parsed["brand"] == "Realme"
    assert parsed["model"] == "GT 6"
    assert parsed["ram"] == "12GB"
    assert parsed["storage"] == "256GB"
    assert parsed["color"] == "Fluid Silver"
    assert parsed["family_name"] == "Realme GT 6"
    assert parsed["family_slug"] == "realme-gt-6"
    assert parsed["clean_search_query"] == "Realme GT 6 256GB 12GB RAM"


def test_parse_product_title_samsung_s24():
    parsed = parse_product_title("Samsung Galaxy S24 Ultra 5G (Titanium Gray, 256GB, 12GB RAM)")
    assert parsed["brand"] == "Samsung"
    assert "Galaxy S24 Ultra" in parsed["model"]
    assert parsed["ram"] == "12GB"
    assert parsed["storage"] == "256GB"
    assert parsed["color"] == "Titanium Gray"
    assert parsed["clean_search_query"] == "Samsung Galaxy S24 Ultra 5G 256GB 12GB RAM"
