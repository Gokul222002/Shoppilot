"""
Catalog Seed Generator for ShopPilot (Phase A)
Generates 312+ realistic products across 8 categories:
- mobiles (67 phones across Realme, Samsung, Apple, OnePlus, Redmi/Xiaomi, Vivo, Oppo, Motorola, Poco, iQOO)
- laptops (35)
- tvs (35)
- headphones (35)
- appliances (35)
- fashion (35)
- grocery (35)
- books (35)

Every product includes:
- 3 to 5 store offers with price, shipping, delivery days, seller rating, stock status, url
- 12 months (365 days) of daily historical prices with festive season dips
"""

import json
import re
from datetime import date, timedelta
from urllib.parse import quote_plus
from typing import List, Dict, Any

STORES = ["Amazon.in", "Flipkart", "Croma", "Tata CLiQ", "Myntra"]

CATEGORY_IMAGES = {
    "mobiles": [
        "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=600&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1580910051074-3eb694886505?w=600&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1565849904461-04a58ad377e0?w=600&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=600&auto=format&fit=crop&q=80",
    ],
    "laptops": [
        "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=600&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=600&auto=format&fit=crop&q=80",
    ],
    "tvs": [
        "https://images.unsplash.com/photo-1593784991095-a205069470b6?w=600&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1509281373149-e957c6296406?w=600&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1461151304267-38535e780c79?w=600&auto=format&fit=crop&q=80",
    ],
    "headphones": [
        "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=600&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=600&auto=format&fit=crop&q=80",
    ],
    "appliances": [
        "https://images.unsplash.com/photo-1585338107529-13afc5f02586?w=600&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=600&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&auto=format&fit=crop&q=80",
    ],
    "fashion": [
        "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=600&auto=format&fit=crop&q=80",
    ],
    "grocery": [
        "https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=600&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1506484381205-f7945653044d?w=600&auto=format&fit=crop&q=80",
    ],
    "books": [
        "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=600&auto=format&fit=crop&q=80",
    ]
}


def slugify(text: str) -> str:
    s = text.lower()
    s = re.sub(r"[^\w\s-]", "", s)
    s = re.sub(r"[\s_]+", "-", s).strip("-")
    return s


def store_url(store: str, name: str) -> str:
    q = quote_plus(name)
    if store == "Amazon.in":
        return f"https://www.amazon.in/s?k={q}"
    elif store == "Flipkart":
        return f"https://www.flipkart.com/search?q={q}"
    elif store == "Myntra":
        return f"https://www.myntra.com/{q}"
    elif store == "Croma":
        return f"https://www.croma.com/searchB?q={q}"
    elif store == "Tata CLiQ":
        return f"https://www.tatacliq.com/search/?searchCategory=all&text={q}"
    return f"https://www.amazon.in/s?k={q}"


def generate_history(base_price: int, seed: int) -> List[Dict[str, Any]]:
    points = []
    today = date(2026, 11, 7)
    for i in range(364, -1, -1):
        d = today - timedelta(days=i)
        month = d.month
        # Sale events: Jan (Republic), Aug (Independence), Oct (Diwali/Great Indian Festival)
        is_sale = month in (1, 8, 10)
        dip = 0.84 if is_sale else 1.0
        noise = (((seed * (i + 1) * 31337) % 1000) / 1000.0 - 0.5) * 0.08
        p = max(base_price * 0.70, base_price * dip * (1.0 + noise))
        points.append({"date": d.isoformat(), "price": round(p)})
    return points


STORE_COUPONS = {
    "Amazon.in": "Extra ₹500 off via HDFC Bank Cards",
    "Flipkart": "10% Instant Discount on Axis Bank",
    "Croma": "Flat ₹1,000 off on ICICI Credit Cards",
    "Tata CLiQ": "Save ₹750 via Tata Neu HDFC Card",
    "Myntra": "Use code MYNTRA200 for ₹200 off",
}


def generate_offers(name: str, base_mrp: int, base_price: int, store_list: List[str]) -> List[Dict[str, Any]]:
    offers = []
    for idx, store in enumerate(store_list):
        # Realistic slight variance across stores
        variation = 1.0 + (((idx * 7 + 3) % 9) - 4) * 0.025
        p = round(base_price * variation)
        m = round(base_mrp * (1.0 + (idx % 3) * 0.02))
        disc = round(((m - p) / m) * 100)
        shipping = 0 if p > 499 else 40
        offers.append({
            "store": store,
            "price": p,
            "mrp": m,
            "discount_pct": disc,
            "shipping": shipping,
            "total_price": p + shipping,
            "in_stock": True if idx != 3 else (idx % 2 == 0),
            "delivery_days": 1 if idx == 0 else (2 if idx == 1 else 3),
            "seller_rating": round(4.2 + (idx % 4) * 0.15, 1),
            "coupon": STORE_COUPONS.get(store),
            "url": store_url(store, name),
            "last_updated": date(2026, 11, 7).isoformat(),
        })
    offers.sort(key=lambda o: o["total_price"])
    return offers
