"""
ShopPilot Store Search URL Builder & Query Sanitizer (Workstream 3)
Builds exact, high-relevance search queries for Indian stores (Amazon.in, Flipkart, Croma, etc.)
by stripping brackets, commas, color names, and clutter while preserving brand, model, storage, and RAM.
"""

import re
from urllib.parse import quote_plus
from typing import Dict, Any, Optional

# Known color names to strip from query (colors confuse store search engines)
KNOWN_COLORS = {
    "fluid silver", "razor green", "submarine blue", "navigator beige",
    "twilight purple", "glass green", "glass gold", "stellar green",
    "mars orange", "feather gold", "nitro blue", "phoenix red", "parrot blue",
    "sunny oasis", "sunshower", "champion gold", "titanium gray", "onyx black",
    "cobalt violet", "awesome navy", "awesome iceblue", "prism silver",
    "smoky teal", "meteor blue", "natural titanium", "blue titanium",
    "flowy emerald", "cool blue", "dark chrome", "misty green", "emerald dusk",
    "fusion purple", "midnight black", "prism gold", "starlight black",
    "asteroid black", "andaman blue", "peacock green", "cosmic blue",
    "aurora gold", "saffron delight", "cream gold", "pearl white", "wave green",
    "lava red", "glowing green", "luxe lavender", "nordic wood", "soothing sea",
    "carbon black", "phantom black", "space gray", "silver", "gold", "black",
    "white", "blue", "green", "red", "yellow", "purple", "orange", "pink",
    "grey", "gray", "midnight", "starlight", "mint", "navy"
}

STORE_SEARCH_TEMPLATES: Dict[str, str] = {
    "Amazon.in": "https://www.amazon.in/s?k={q}",
    "Flipkart": "https://www.flipkart.com/search?q={q}",
    "Croma": "https://www.croma.com/searchB?q={q}",
    "Tata CLiQ": "https://www.tatacliq.com/search/?searchCategory=all&text={q}",
    "Myntra": "https://www.myntra.com/{q}",
}


def sanitize_product_query(
    title: str,
    brand: Optional[str] = None,
    model: Optional[str] = None,
    storage: Optional[str] = None,
    ram: Optional[str] = None,
) -> str:
    """
    Sanitizes a product query starting from brand + model + storage + RAM (excluding color).
    Removes ( ) [ ] , | / - and punctuation; collapses spaces.
    Example:
        'Realme GT 6 (Fluid Silver, 256GB, 12GB RAM)' -> 'Realme GT 6 256GB 12GB RAM'
    """
    # If structured fields are explicitly provided, assemble directly
    if brand and model:
        tokens = [brand.strip(), model.strip()]
        if storage:
            tokens.append(storage.strip())
        if ram:
            tokens.append(ram.strip())
        assembled = " ".join(tokens)
    else:
        assembled = title or ""

    # Remove known color names
    lower_s = assembled.lower()
    for col in sorted(KNOWN_COLORS, key=len, reverse=True):
        pattern = r"\b" + re.escape(col) + r"\b"
        assembled = re.sub(pattern, "", assembled, flags=re.IGNORECASE)

    # Remove ( ) [ ] { } , | / - _ and extra punctuation
    assembled = re.sub(r"[()\[\]{},|/\\_+]", " ", assembled)

    # Normalize RAM and Storage representations (e.g., '12 GB RAM' -> '12GB RAM', '256 GB' -> '256GB')
    assembled = re.sub(r"\b(\d+)\s+gb\b", r"\1GB", assembled, flags=re.IGNORECASE)
    assembled = re.sub(r"\b(\d+)\s+tb\b", r"\1TB", assembled, flags=re.IGNORECASE)

    # Collapse multiple spaces and trim
    cleaned = re.sub(r"\s+", " ", assembled).strip()
    return cleaned


def build_store_url(
    store: str,
    title: str,
    product_url: Optional[str] = None,
    affiliate_tag: Optional[str] = None,
    brand: Optional[str] = None,
    model: Optional[str] = None,
    storage: Optional[str] = None,
    ram: Optional[str] = None,
) -> str:
    """
    Builds the store URL. If a real direct productUrl from an official API or feed exists,
    uses it (appending the affiliate tag). Otherwise builds a high-precision store search URL.
    """
    if product_url and product_url.strip() and not product_url.startswith("https://www.amazon.in/s?k="):
        url = product_url.strip()
        if affiliate_tag and "tag=" not in url:
            sep = "&" if "?" in url else "?"
            url = f"{url}{sep}tag={quote_plus(affiliate_tag)}"
        return url

    clean_q = sanitize_product_query(title=title, brand=brand, model=model, storage=storage, ram=ram)
    encoded_q = quote_plus(clean_q)

    template = STORE_SEARCH_TEMPLATES.get(store, STORE_SEARCH_TEMPLATES["Amazon.in"])
    return template.format(q=encoded_q)
