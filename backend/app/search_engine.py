"""
Typo-Tolerant Multi-Store Search Engine (ShopPilot Phase A)
Handles typos, phonetic variations, partial strings, and spec queries.
Examples:
  'relme' -> 'Realme'
  'iphon 15' -> 'Apple iPhone 15'
  'samsung s24 ultra' -> 'Samsung Galaxy S24 Ultra 5G'
"""

import re
from typing import List, Dict, Any, Optional

# Common e-commerce typo mappings
TYPO_SYNONYMS = {
    "relme": "realme",
    "realmi": "realme",
    "relm": "realme",
    "iphon": "iphone",
    "iphne": "iphone",
    "ifone": "iphone",
    "samsng": "samsung",
    "samung": "samsung",
    "galxy": "galaxy",
    "glaxy": "galaxy",
    "oneplu": "oneplus",
    "one pluse": "oneplus",
    "1plus": "oneplus",
    "xomi": "xiaomi",
    "redmi": "redmi",
    "radmi": "redmi",
    "motrola": "motorola",
    "moto": "motorola",
    "mackbook": "macbook",
    "mcbook": "macbook",
    "earphone": "headphones",
    "headphone": "headphones",
    "bravia": "sony bravia",
}


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


def normalize_query_tokens(query: str) -> List[str]:
    clean = re.sub(r"[^\w\s]", " ", query.lower())
    raw_tokens = [t.strip() for t in clean.split() if len(t.strip()) > 0]
    normalized = []
    for t in raw_tokens:
        mapped = TYPO_SYNONYMS.get(t, t)
        normalized.append(mapped)
    return normalized


def score_product_match(query_tokens: List[str], product: Dict[str, Any]) -> float:
    name_clean = re.sub(r"[^\w\s]", " ", product["name"].lower())
    brand_clean = product["brand"].lower()
    cat_clean = product["category"].lower()
    tags_clean = [t.lower() for t in product.get("tags", [])]

    name_tokens = name_clean.split()
    score = 0.0

    for q_tok in query_tokens:
        matched = False

        # 1. Exact token in name, brand, or category
        if q_tok == brand_clean:
            score += 10.0
            matched = True
        elif q_tok == cat_clean:
            score += 5.0
            matched = True
        elif q_tok in name_tokens:
            score += 4.0
            matched = True
        elif any(q_tok in tag for tag in tags_clean):
            score += 3.0
            matched = True

        # 2. Substring match in product name
        elif q_tok in name_clean:
            score += 2.5
            matched = True

        # 3. Fuzzy Levenshtein match for typo tolerance
        if not matched and len(q_tok) >= 3:
            # Check against brand
            dist_brand = levenshtein_distance(q_tok, brand_clean)
            if dist_brand <= 1:
                score += 8.0
                matched = True
            elif dist_brand <= 2 and len(q_tok) >= 5:
                score += 5.0
                matched = True

            if not matched:
                # Check against name tokens
                for n_tok in name_tokens:
                    if len(n_tok) >= 3:
                        dist = levenshtein_distance(q_tok, n_tok)
                        max_allowed_dist = 1 if len(q_tok) <= 5 else 2
                        if dist <= max_allowed_dist:
                            score += 3.0
                            matched = True
                            break

    return score


def search_catalog_fuzzy(
    catalog: List[Dict[str, Any]],
    query: str,
    category: Optional[str] = None,
    min_price: Optional[int] = None,
    max_price: Optional[int] = None,
    store: Optional[str] = None,
    sort_by: Optional[str] = None,
) -> List[Dict[str, Any]]:
    tokens = normalize_query_tokens(query)

    scored_items = []
    for p in catalog:
        # Category filter
        if category and category != "all" and p["category"] != category:
            continue

        # Store filter
        if store and not any(o["store"] == store for o in p["offers"]):
            continue

        best_price = min(o["price"] for o in p["offers"])

        # Price range filter
        if min_price is not None and best_price < min_price:
            continue
        if max_price is not None and best_price > max_price:
            continue

        # If query is empty, return all matching filters
        if not tokens:
            scored_items.append((p, 1.0))
            continue

        # Calculate typo-tolerant score
        score = score_product_match(tokens, p)
        if score > 0.0:
            scored_items.append((p, score))

    # Sort results
    if sort_by == "price_asc":
        scored_items.sort(key=lambda x: min(o["price"] for o in x[0]["offers"]))
    elif sort_by == "price_desc":
        scored_items.sort(key=lambda x: min(o["price"] for o in x[0]["offers"]), reverse=True)
    elif sort_by == "rating":
        scored_items.sort(key=lambda x: (x[0]["rating"], x[0]["reviewCount"]), reverse=True)
    elif sort_by == "discount":
        scored_items.sort(key=lambda x: max(o["discount_pct"] for o in x[0]["offers"]), reverse=True)
    else:
        # Best match relevance score descending, then review count
        scored_items.sort(key=lambda x: (x[1], x[0]["reviewCount"]), reverse=True)

    return [item[0] for item in scored_items]
