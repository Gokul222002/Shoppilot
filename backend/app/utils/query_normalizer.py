"""
Query Normalization & Product Title Parser (ShopPilot Workstream 2 & Defect D2/D4 Fixes)
Standardizes user search strings, handles typos, splits letter-digit joins,
strips e-commerce noise words, and parses product titles into structured variant attributes.
"""

import re
from typing import Dict, Any, List, Optional, Tuple


# Synonym and typo substitutions
SYNONYM_MAP = {
    r"\brelme\b": "realme",
    r"\breal\s+me\b": "realme",
    r"\brealm\b": "realme",
    r"\biphon\b": "iphone",
    r"\biphne\b": "iphone",
    r"\bi\s+phone\b": "iphone",
    r"\bifone\b": "iphone",
    r"\bsamsng\b": "samsung",
    r"\bsamung\b": "samsung",
    r"\bgalxy\b": "galaxy",
    r"\bglaxy\b": "galaxy",
    r"\bone\s+plus\b": "oneplus",
    r"\b1plus\b": "oneplus",
    r"\bred\s+mi\b": "redmi",
    r"\bradmi\b": "redmi",
    r"\bxiao\s+mi\b": "xiaomi",
    r"\bmackbook\b": "macbook",
    r"\bmcbook\b": "macbook",
    r"\bmotrola\b": "motorola",
}
TYPO_SYNONYMS = SYNONYM_MAP

# E-commerce search noise words
NOISE_WORDS = {
    "price", "prices", "buy", "online", "best", "cheap", "cost", "costs",
    "rate", "rates", "deal", "deals", "discount", "discounts", "offer",
    "offers", "review", "reviews", "spec", "specs", "specification", "specifications",
    "purchase", "store", "stores", "india", "inr"
}

KNOWN_BRANDS = [
    "Realme", "Samsung", "Apple", "OnePlus", "Xiaomi", "Redmi", "Vivo",
    "Oppo", "Motorola", "Moto", "Poco", "iQOO", "boAt", "Sony", "Bose",
    "JBL", "Dell", "HP", "Lenovo", "ASUS", "Acer", "LG", "TCL", "Hisense"
]


def split_letter_digit_joins(text: str) -> str:
    """
    Splits joins like 'gt6' -> 'gt 6', 's24ultra' -> 's 24 ultra', 'c55' -> 'c 55', '12pro' -> '12 pro'.
    Preserves RAM/storage indicators like '128gb', '12gb', '1tb'.
    """
    # 1. Protect storage & RAM tokens by replacing them temporarily
    storage_ram_tokens: List[Tuple[str, str]] = []
    def save_storage(m):
        idx = len(storage_ram_tokens)
        token = f"__STRAM_{idx}__"
        storage_ram_tokens.append((token, m.group(0).lower()))
        return f" {token} "

    # Pattern matches 8gb, 128gb, 1tb, 12gb ram, etc.
    s = re.sub(r"\b(\d+)\s*(gb|tb|mb)(\s+ram)?\b", save_storage, text, flags=re.IGNORECASE)

    # 2. Split letter then digit (e.g., gt6 -> gt 6, s24 -> s 24, c55 -> c 55, neo9 -> neo 9)
    s = re.sub(r"([a-zA-Z]+)(\d+)", r"\1 \2", s)

    # 3. Split digit then letter (e.g., 24ultra -> 24 ultra, 12pro -> 12 pro, 15plus -> 15 plus)
    s = re.sub(r"(\d+)([a-zA-Z]+)", r"\1 \2", s)

    # 4. Restore protected storage/RAM tokens
    for token, orig in storage_ram_tokens:
        s = s.replace(token, orig)

    return s


def normalize_query(query: str, strip_noise: bool = True) -> str:
    """
    Comprehensive query normalization for search box, family matcher, and AI advisor:
    1. Lowercases text.
    2. Removes punctuation & special characters.
    3. Normalizes common typos and multi-word brand spellings ('relme' -> 'realme', 'i phone' -> 'iphone').
    4. Splits letter-digit joins ('gt6' -> 'gt 6', 's24' -> 's 24').
    5. Optionally strips noise words ('price', 'buy', 'online', etc.).
    """
    if not query:
        return ""

    s = query.lower()

    # Apply typo synonyms before stripping punctuation
    for pattern, repl in SYNONYM_MAP.items():
        s = re.sub(pattern, repl, s)

    # Replace punctuation with spaces
    s = re.sub(r"[\(\)\[\]\{\},;:!?\"'_~`|\/\\*+=#@^&<>]", " ", s)
    s = re.sub(r"-(?!\d)", " ", s)  # keep hyphens in negative numbers if any, otherwise space

    # Split letter-digit joins
    s = split_letter_digit_joins(s)

    tokens = s.split()

    if strip_noise:
        # Only strip noise words if we have at least 1 other token remaining
        meaningful = [t for t in tokens if t not in NOISE_WORDS]
        if meaningful:
            tokens = meaningful

    return " ".join(tokens).strip()


def parse_product_title(title: str, default_brand: Optional[str] = None) -> Dict[str, Any]:
    """
    Parses product title into structured attributes:
    - brand (e.g. 'Realme')
    - series (e.g. 'GT Series', 'Narzo Series', 'Galaxy S Series')
    - model (e.g. 'GT 6', 'Galaxy S24 Ultra', 'iPhone 15')
    - ram (e.g. '12GB')
    - storage (e.g. '256GB')
    - color (e.g. 'Fluid Silver', 'Titanium Gray')
    - family_slug (e.g. 'realme-gt-6')
    - family_name (e.g. 'Realme GT 6')
    - clean_search_query (e.g. 'Realme GT 6 256GB 12GB RAM')
    """
    raw_title = title.strip()

    # 1. Identify Brand
    found_brand = default_brand or "Generic"
    for b in KNOWN_BRANDS:
        if re.search(rf"\b{re.escape(b)}\b", raw_title, flags=re.IGNORECASE):
            found_brand = b
            break

    # 2. Extract RAM
    ram_match = re.search(r"\b(\d+)\s*GB\s+RAM\b", raw_title, flags=re.IGNORECASE)
    ram = f"{ram_match.group(1)}GB" if ram_match else None

    # 3. Extract Storage
    storage_match = re.search(r"\b(\d+)\s*(GB|TB)\b(?!\s*RAM)", raw_title, flags=re.IGNORECASE)
    storage = None
    if storage_match:
        storage = f"{storage_match.group(1)}{storage_match.group(2).upper()}"

    # 4. Extract Color (from parentheses if present, e.g. "(Fluid Silver, 256GB, 12GB RAM)")
    color = None
    paren_match = re.search(r"\(([^)]+)\)", raw_title)
    if paren_match:
        parts = [p.strip() for p in paren_match.group(1).split(",")]
        for p in parts:
            if not re.search(r"\b(\d+)\s*(GB|TB|RAM|SSD)\b", p, flags=re.IGNORECASE):
                color = p
                break

    # 5. Extract Model & Series
    # Strip brand and parentheses from title to isolate model name
    clean_model_base = re.sub(rf"\b{re.escape(found_brand)}\b", "", raw_title, flags=re.IGNORECASE)
    clean_model_base = re.sub(r"\([^)]*\)", "", clean_model_base).strip()
    clean_model_base = re.sub(r"\s+", " ", clean_model_base).strip(" -:,")

    # Determine Series
    series = None
    lower_title = raw_title.lower()
    if "gt" in lower_title:
        series = "GT Series"
    elif "narzo" in lower_title:
        series = "Narzo Series"
    elif "galaxy s" in lower_title:
        series = "Galaxy S Series"
    elif "galaxy a" in lower_title:
        series = "Galaxy A Series"
    elif "galaxy m" in lower_title or "galaxy f" in lower_title:
        series = "Galaxy M/F Series"
    elif "iphone" in lower_title:
        series = "iPhone"
    elif "macbook" in lower_title:
        series = "MacBook"
    elif "nord" in lower_title:
        series = "Nord Series"
    elif "note" in lower_title:
        series = "Redmi Note Series"
    elif "edge" in lower_title:
        series = "Edge Series"
    elif "rockerz" in lower_title:
        series = "Rockerz Series"

    # Family Name and Slug
    family_name = f"{found_brand} {clean_model_base}".strip()
    # Normalize family name to prevent trailing edition noise
    family_slug = re.sub(r"[^\w\s-]", "", family_name.lower())
    family_slug = re.sub(r"[\s_]+", "-", family_slug).strip("-")

    # Clean search query for outbound links and high-precision search
    clean_parts = [found_brand, clean_model_base]
    if storage:
        clean_parts.append(storage)
    if ram:
        clean_parts.append(f"{ram} RAM")
    clean_search_query = " ".join([p for p in clean_parts if p]).strip()
    clean_search_query = re.sub(r"\s+", " ", clean_search_query)

    return {
        "brand": found_brand,
        "series": series,
        "model": clean_model_base,
        "ram": ram,
        "storage": storage,
        "color": color,
        "family_name": family_name,
        "family_slug": family_slug,
        "clean_search_query": clean_search_query,
    }
