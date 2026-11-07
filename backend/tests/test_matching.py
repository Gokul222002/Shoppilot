import pytest
from app.matching import calculate_match_score, extract_attributes

def test_identical_phone_different_stores():
    title_amazon = "Apple iPhone 15 (128 GB) - Black"
    title_flipkart = "Apple iPhone 15 128GB Black Smartphone"
    score = calculate_match_score(title_amazon, title_flipkart)
    assert score >= 0.70, f"Expected high match score, got {score}"

def test_different_storage_variants():
    title_128 = "Apple iPhone 15 128GB Black"
    title_256 = "Apple iPhone 15 256GB Black"
    score = calculate_match_score(title_128, title_256)
    assert score <= 0.35, f"Expected low score for different storage, got {score}"

def test_incompatible_brands():
    title_apple = "Apple iPhone 15 128GB"
    title_samsung = "Samsung Galaxy S24 128GB"
    score = calculate_match_score(title_apple, title_samsung)
    assert score == 0.0, f"Expected 0.0 for different brands, got {score}"

def test_fan_spec_matching():
    title_1 = "Atomberg Renesa 1200mm BLDC Ceiling Fan with Remote"
    title_2 = "Atomberg Renesa BLDC Motor 1200mm Smart Fan"
    score = calculate_match_score(title_1, title_2)
    assert score >= 0.65, f"Expected good match for same fan, got {score}"

def test_extract_specs():
    attrs = extract_attributes("OnePlus 12 5G (Flowy Emerald, 256 GB, 16 GB RAM)")
    assert attrs["brand"] == "oneplus"
    assert attrs["storage"] == "256gb"
