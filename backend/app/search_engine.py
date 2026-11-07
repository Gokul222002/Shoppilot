"""
Typo-Tolerant Multi-Store Search Engine with Family Hierarchy (ShopPilot Defect D2 Fix)
Handles typos, phonetic variations, partial strings, and spec queries.
Enforces strict ranking hierarchy:
  Exact family match first > same series > same brand.
"""

import json
import re
from urllib.parse import urlparse, unquote
from typing import List, Dict, Any, Optional

from app.utils.query_normalizer import normalize_query, split_letter_digit_joins, TYPO_SYNONYMS


def levenshtein_distance(s1: str, s2: str) -> int:
    """Calculate the Levenshtein distance between two strings."""
    if len(s1) < len(s2):
        return levenshtein_distance(s2, s1)
    if len(s2) == 0:
        return len(s1)

    previous_row = range(len(s2) + 1)
    for i, c1 in enumerate(s1):
        current_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row

    return previous_row[-1]


def extract_query_from_input(raw_input: str) -> str:
    """Extract product query if user pasted an e-commerce URL or messy link."""
    s = raw_input.strip()
    if s.startswith("http://") or s.startswith("https://") or any(dom in s for dom in ("amazon.", "flipkart.", "croma.", "tatacliq.", "myntra.")):
        try:
            parsed = urlparse(s if s.startswith("http") else f"https://{s}")
            path = unquote(parsed.path)
            parts = [p for p in path.split("/") if p and p not in ("dp", "p", "gp", "product", "buy", "item", "search")]
            if parts:
                slug_part = parts[0]
                extracted = re.sub(r"[-_+.]+", " ", slug_part)
                extracted = re.sub(r"\b(dp|ref|qid|sr|itm\w+|asin)\b", "", extracted, flags=re.IGNORECASE)
                if len(extracted.strip()) > 2:
                    return extracted.strip()
        except Exception:
            pass
    return s


def normalize_query_tokens(query: str) -> List[str]:
    parsed_query = extract_query_from_input(query)
    normalized_str = normalize_query(parsed_query, strip_noise=True)
    return [t.strip() for t in normalized_str.split() if len(t.strip()) > 0]


def score_product_match(query_tokens: List[str], product: Dict[str, Any], raw_query: str = "") -> float:
    """
    Ranks matching products using strict Workstream 2 hierarchy:
    1. Exact family match first (>150.0 points)
    2. Same series match (>35.0 points)
    3. Same brand match (>20.0 points)
    4. Exact variant attributes (storage, RAM, color) (+25.0 points)
    """
    # Normalize product name and family name with split_letter_digit_joins too!
    name_norm = split_letter_digit_joins(product["name"]).lower()
    name_clean = re.sub(r"[^\w\s]", " ", name_norm)
    brand_clean = product["brand"].lower()
    cat_clean = product["category"].lower()

    family_raw = product.get("familyName") or product.get("family_name") or ""
    family_norm = split_letter_digit_joins(family_raw).lower()
    family_clean = re.sub(r"[^\w\s]", " ", family_norm)
    series = (product.get("series") or "").lower()
    tags_clean = [t.lower() for t in product.get("tags", [])]

    name_tokens = name_clean.split()
    family_tokens = [t for t in family_clean.split() if len(t) > 0 and t not in ("5g", "4g")]
    meaningful_q_tokens = [t for t in query_tokens if t not in ("5g", "4g")]

    score = 0.0

    # Category keyword matching
    for q_tok in query_tokens:
        if q_tok in (cat_clean, cat_clean[:-1]):
            score += 15.0
        elif q_tok in ("phone", "mobile", "smartphone") and cat_clean == "mobiles":
            score += 15.0
        elif q_tok in ("laptop", "notebook", "laptops") and cat_clean == "laptops":
            score += 15.0
        elif q_tok in ("tv", "television", "tvs") and cat_clean == "tvs":
            score += 15.0
        elif q_tok in ("headphone", "headphones", "earphone", "earbuds", "earbud") and cat_clean == "headphones":
            score += 15.0
        elif q_tok in ("appliance", "appliances", "fridge", "washing", "machine", "fan") and cat_clean == "appliances":
            score += 15.0

    # 1. Exact Family Match (Top Priority: fixes Defect D2)
    if family_tokens and meaningful_q_tokens:
        q_matched_in_family = [t for t in meaningful_q_tokens if t in family_tokens]
        if len(q_matched_in_family) == len(meaningful_q_tokens) and len(meaningful_q_tokens) >= 2:
            score += 200.0  # Every query token belongs to this exact product family!
        elif len(q_matched_in_family) >= 2 and len(q_matched_in_family) >= len(family_tokens) - 1:
            score += 120.0
        elif len(q_matched_in_family) >= 2:
            score += 60.0

    # Check query tokens in name
    q_matched_in_name = [t for t in meaningful_q_tokens if t in name_tokens]
    if len(q_matched_in_name) == len(meaningful_q_tokens) and len(meaningful_q_tokens) >= 2:
        score += 80.0

    # 2. Same Series Match
    if series and any(t in series for t in meaningful_q_tokens if len(t) > 2):
        score += 35.0

    # 3. Same Brand Match
    if brand_clean in meaningful_q_tokens:
        score += 20.0

    # 4. Variant Attributes (Storage & RAM matching)
    v_attrs = product.get("variantAttributes") or product.get("variant_attributes") or {}
    if isinstance(v_attrs, str):
        try:
            v_attrs = json.loads(v_attrs)
        except Exception:
            v_attrs = {}

    v_storage = str(v_attrs.get("storage") or "").lower()
    v_ram = str(v_attrs.get("ram") or "").lower()
    v_color = str(v_attrs.get("color") or "").lower()

    for q_tok in query_tokens:
        if v_storage and q_tok == v_storage:
            score += 25.0
        if v_ram and (q_tok == v_ram or q_tok in v_ram):
            score += 20.0
        if v_color and q_tok in v_color:
            score += 15.0

    # 5. Token & Substring Matching
    for q_tok in query_tokens:
        matched = False
        if q_tok in name_tokens:
            score += 8.0
            matched = True
        elif any(q_tok in tag for tag in tags_clean):
            score += 4.0
            matched = True
        elif q_tok in name_clean:
            score += 3.0
            matched = True

        # Levenshtein distance check for typos
        if not matched and len(q_tok) >= 3:
            dist_brand = levenshtein_distance(q_tok, brand_clean)
            if dist_brand <= 1:
                score += 12.0
                matched = True

            if not matched:
                for n_tok in name_tokens:
                    if len(n_tok) >= 3:
                        dist = levenshtein_distance(q_tok, n_tok)
                        max_allowed = 1 if len(q_tok) <= 5 else 2
                        if dist <= max_allowed:
                            score += 6.0
                            matched = True
                            break

    return score


def search_catalog_fuzzy(
    catalog: List[Dict[str, Any]],
    query: str,
    category: Optional[str] = None,
    brand: Optional[str] = None,
    min_price: Optional[int] = None,
    max_price: Optional[int] = None,
    store: Optional[str] = None,
    in_stock_only: Optional[bool] = None,
    sort_by: Optional[str] = None,
) -> List[Dict[str, Any]]:
    tokens = normalize_query_tokens(query)
    clean_q = query.strip()
    is_barcode = clean_q.isdigit() and len(clean_q) >= 8

    scored_items = []
    for p in catalog:
        # Category filter
        if category and category != "all" and p["category"].lower() != category.lower():
            continue

        # Brand filter
        if brand and brand != "all" and p["brand"].lower() != brand.lower():
            continue

        # Store filter
        if store and not any(o["store"] == store for o in p["offers"]):
            continue

        # In-stock filter
        if in_stock_only and not any(o.get("in_stock", True) for o in p["offers"]):
            continue

        best_price = min(o["price"] for o in p["offers"])

        # Price range filter
        if min_price is not None and best_price < min_price:
            continue
        if max_price is not None and best_price > max_price:
            continue

        # Barcode exact match
        if is_barcode:
            if p.get("barcode") == clean_q:
                scored_items.append((p, 1000.0))
            continue

        # If empty query, return all matching filters
        if not query.strip():
            scored_items.append((p, 1.0))
            continue

        # Score matching
        s = score_product_match(tokens, p, raw_query=query)
        if s > 0:
            scored_items.append((p, s))

    # Apply sorting
    if sort_by == "price_asc":
        scored_items.sort(key=lambda x: min(o["price"] for o in x[0]["offers"]))
    elif sort_by == "price_desc":
        scored_items.sort(key=lambda x: -min(o["price"] for o in x[0]["offers"]))
    elif sort_by == "rating":
        scored_items.sort(key=lambda x: -x[0]["rating"])
    elif sort_by == "discount":
        scored_items.sort(key=lambda x: -max(o["discount_pct"] for o in x[0]["offers"]))
    else:
        # Default: relevance score descending
        scored_items.sort(key=lambda x: -x[1])

    return [item[0] for item in scored_items]
