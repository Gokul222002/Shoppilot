"""
Product Matching & Canonical Deduplication Engine (ShopPilot)
Extracts attributes from disparate e-commerce listings (Amazon, Flipkart, etc.)
and computes match confidence scores.
"""

import re
from typing import Dict, Any, Optional, Set

COMMON_STOP_WORDS = {
    "with", "for", "and", "the", "in", "of", "pack", "set", "new", "latest",
    "smart", "ultra", "super", "high", "speed", "fast", "original", "genuine"
}

KNOWN_BRANDS = [
    "apple", "samsung", "oneplus", "xiaomi", "redmi", "realme", "poco", "iqoo",
    "motorola", "google", "dell", "hp", "lenovo", "asus", "acer", "sony", "jbl",
    "boat", "bose", "marshall", "atomberg", "crompton", "havells", "usha", "orient",
    "logitech", "razer", "portronics", "borosil", "milton", "cello"
]


def clean_text(text: str) -> str:
    text = text.lower()
    text = re.sub(r"[^\w\s-]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def extract_attributes(title: str, brand_hint: Optional[str] = None) -> Dict[str, Any]:
    clean = clean_text(title)
    words = clean.split()

    # Storage match
    storage_match = re.search(r"(\d+)\s*(gb|tb)\b", clean)
    storage = f"{storage_match.group(1)}{storage_match.group(2)}" if storage_match else None

    # Size match
    size_match = re.search(r"(\d+(?:\.\d+)?)\s*(mm|cm|inch|in)\b", clean)
    size = f"{size_match.group(1)}{size_match.group(2)}" if size_match else None

    # Brand
    brand = brand_hint.lower() if brand_hint else ""
    if not brand:
        for b in KNOWN_BRANDS:
            if b in words:
                brand = b
                break
        if not brand and words:
            brand = words[0]

    # Clean tokens
    cleaned = [
        w for w in words
        if len(w) > 1 and w not in COMMON_STOP_WORDS and w != brand
    ]

    return {
        "brand": brand,
        "storage": storage,
        "size": size,
        "tokens": cleaned,
    }


def calculate_match_score(title_a: str, title_b: str) -> float:
    attr_a = extract_attributes(title_a)
    attr_b = extract_attributes(title_b)

    # Incompatible brands
    if attr_a["brand"] and attr_b["brand"] and attr_a["brand"] != attr_b["brand"]:
        return 0.0

    # Incompatible specs
    if attr_a["storage"] and attr_b["storage"] and attr_a["storage"] != attr_b["storage"]:
        return 0.2
    if attr_a["size"] and attr_b["size"] and attr_a["size"] != attr_b["size"]:
        return 0.2

    set_a = set(attr_a["tokens"])
    set_b = set(attr_b["tokens"])
    if not set_a or not set_b:
        return 0.0

    jaccard = len(set_a & set_b) / len(set_a | set_b)
    score = jaccard

    if attr_a["brand"] and attr_a["brand"] == attr_b["brand"]:
        score += 0.25
    if attr_a["storage"] and attr_a["storage"] == attr_b["storage"]:
        score += 0.15
    if attr_a["size"] and attr_a["size"] == attr_b["size"]:
        score += 0.15

    return min(1.0, round(score, 2))
