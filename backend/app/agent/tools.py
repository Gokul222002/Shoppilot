"""
Grounding Tools for ShopPilot AI Shopping Advisor (Workstream 5)
Provides strict, verifiable tool functions over the catalog database for Gemini function calling
and offline deterministic tool execution.
"""

import json
import os
from typing import List, Dict, Any, Optional

from app.search_engine import search_catalog_fuzzy
from app.utils.query_normalizer import normalize_query

CATALOG_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "catalog.json")


def _get_catalog() -> List[Dict[str, Any]]:
    if os.path.exists(CATALOG_PATH):
        with open(CATALOG_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


def tool_search_products(
    query: str,
    category: Optional[str] = None,
    min_price: Optional[int] = None,
    max_price: Optional[int] = None,
    limit: int = 5,
) -> List[Dict[str, Any]]:
    """
    Search the verified catalog for products matching a query or specification.
    Returns products with side-by-side store offers and ratings.
    """
    catalog = _get_catalog()
    results = search_catalog_fuzzy(
        catalog,
        query=query,
        category=category,
        min_price=min_price,
        max_price=max_price,
    )
    trimmed = []
    for p in results[:limit]:
        best_offer = min(p["offers"], key=lambda o: o["price"])
        trimmed.append({
            "id": p["id"],
            "name": p["name"],
            "brand": p["brand"],
            "category": p["category"],
            "family_name": p.get("familyName", p["name"]),
            "best_price": best_offer["price"],
            "mrp": best_offer["mrp"],
            "best_store": best_offer["store"],
            "rating": p["rating"],
            "review_count": p["reviewCount"],
            "tags": p.get("tags", []),
            "variants_count": len(p.get("variants", [])),
            "store_offers": [
                {"store": o["store"], "price": o["price"], "mrp": o["mrp"], "in_stock": o["in_stock"]}
                for o in p["offers"]
            ],
        })
    return trimmed


def tool_get_family(brand: str, model: str) -> Dict[str, Any]:
    """
    Retrieve all variants (storage, RAM, colors) and store prices for a specific product family.
    Example: brand="Realme", model="GT 6"
    """
    catalog = _get_catalog()
    norm_target = normalize_query(f"{brand} {model}")
    matching_variants = []

    for p in catalog:
        p_fam = normalize_query(p.get("familyName") or p["name"])
        if norm_target in p_fam or p_fam in norm_target:
            best_offer = min(p["offers"], key=lambda o: o["price"])
            matching_variants.append({
                "id": p["id"],
                "name": p["name"],
                "variant_attributes": p.get("variantAttributes", {}),
                "best_price": best_offer["price"],
                "mrp": best_offer["mrp"],
                "best_store": best_offer["store"],
                "offers": [
                    {"store": o["store"], "price": o["price"], "shipping": o["shipping"], "url": o["url"]}
                    for o in p["offers"]
                ]
            })

    if not matching_variants:
        return {"found": False, "message": f"No product family found matching {brand} {model}"}

    prices = [v["best_price"] for v in matching_variants]
    return {
        "found": True,
        "brand": brand,
        "model": model,
        "variant_count": len(matching_variants),
        "price_range": {"min": min(prices), "max": max(prices)},
        "variants": matching_variants,
    }


def tool_get_offers(product_id: str) -> Dict[str, Any]:
    """
    Get all retailer offers side-by-side for a specific product ID.
    """
    catalog = _get_catalog()
    for p in catalog:
        if p["id"] == product_id or p["slug"] == product_id:
            return {
                "id": p["id"],
                "name": p["name"],
                "brand": p["brand"],
                "offers": p["offers"],
            }
    return {"error": f"Product with ID '{product_id}' not found"}


def tool_compare_families(family_a: str, family_b: str) -> Dict[str, Any]:
    """
    Compare two product families side by side (e.g. Realme GT 6 vs OnePlus 12R).
    """
    fam_a_data = tool_search_products(family_a, limit=2)
    fam_b_data = tool_search_products(family_b, limit=2)

    return {
        "family_a": {"query": family_a, "matches": fam_a_data},
        "family_b": {"query": family_b, "matches": fam_b_data},
    }


def tool_get_price_history(product_id: str) -> Dict[str, Any]:
    """
    Get 12-month historical lowest, highest, average, and latest price for a product.
    """
    catalog = _get_catalog()
    for p in catalog:
        if p["id"] == product_id or p["slug"] == product_id:
            hist = p.get("priceHistory", [])
            if not hist:
                return {"id": p["id"], "name": p["name"], "history_available": False}
            prices = [pt["price"] for pt in hist]
            return {
                "id": p["id"],
                "name": p["name"],
                "lowest_price": min(prices),
                "highest_price": max(prices),
                "average_price": round(sum(prices) / len(prices)),
                "current_price": min(o["price"] for o in p["offers"]),
                "points_count": len(hist),
            }
    return {"error": f"Product with ID '{product_id}' not found"}
