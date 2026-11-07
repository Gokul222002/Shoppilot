"""
Multi-Stage Product Matcher & Deduplication Pipeline (ShopPilot Phase D)
Matcher Order:
1. Barcode check (GS1 / EAN / UPC) -> 1.0 confidence
2. Model number & spec check (Brand, Model, Storage, RAM)
3. Embedding cosine similarity with brand & spec guards

Confidence Threshold:
- >= 0.85: Auto-merged into canonical product
- 0.50 - 0.84: Sent to Admin Review Queue
- < 0.50: Rejected match
"""

import re
import logging
from datetime import datetime
from typing import Dict, Any, Optional, List, Tuple

from app.ml.vector_engine import vector_engine, clean_text

logger = logging.getLogger("ShopPilot.ML.Matching")

KNOWN_BRANDS = [
    "apple", "samsung", "oneplus", "xiaomi", "redmi", "realme", "poco", "iqoo",
    "motorola", "vivo", "oppo", "google", "dell", "hp", "lenovo", "asus", "acer",
    "sony", "jbl", "boat", "noise", "boult", "bose", "marshall", "atomberg",
    "crompton", "havells", "usha", "orient", "logitech", "razer", "portronics",
    "borosil", "milton", "cello"
]

COMMON_STOP_WORDS = {
    "with", "for", "and", "the", "in", "of", "pack", "set", "new", "latest",
    "smart", "super", "high", "speed", "fast", "original", "genuine", "buy",
    "online", "best", "deal", "discount", "free", "shipping", "warranty"
}


EXCLUDED_MODEL_TERMS = {"5g", "4g", "3g", "lte", "wifi", "tws", "hd", "fhd", "uhd", "4k", "8k"}

def extract_attributes(title: str, brand_hint: Optional[str] = None) -> Dict[str, Any]:
    """Extracts structured hardware attributes from listing titles."""
    # Pre-normalize symbols before punctuation stripping
    norm_title = title.replace("+", " plus ")
    clean = clean_text(norm_title)
    words = clean.split()

    # Storage match (e.g. 64GB, 128GB, 256GB, 512GB, 1TB)
    storage_match = re.search(r"\b(\d+)\s*(gb|tb)\b", clean)
    storage = f"{storage_match.group(1)}{storage_match.group(2)}" if storage_match else None

    # RAM match (e.g. 4GB RAM, 8GB RAM, 12GB RAM)
    ram_match = re.search(r"\b(\d+)\s*gb\s*ram\b", clean)
    ram = f"{ram_match.group(1)}gb" if ram_match else None

    # Size match (e.g. 6.7-inch, 13.6-inch, 55-inch, 1200mm)
    size_match = re.search(r"(\d+(?:\.\d+)?)\s*(mm|cm|inch|in)\b", clean)
    size = f"{size_match.group(1)}{size_match.group(2)}" if size_match else None

    # Brand extraction
    brand = brand_hint.lower() if brand_hint else ""
    if not brand:
        for b in KNOWN_BRANDS:
            if b in words:
                brand = b
                break
        if not brand and words:
            brand = words[0]

    # Model Tier Modifier extraction (Pro+, Pro, Plus, Ultra, Max, etc.)
    tier = None
    if "pro+" in clean or "pro plus" in clean:
        tier = "pro_plus"
    elif "pro max" in clean:
        tier = "pro_max"
    elif "pro" in words:
        tier = "pro"
    elif "plus" in words or "+" in clean:
        tier = "plus"
    elif "ultra" in words:
        tier = "ultra"
    elif "max" in words:
        tier = "max"
    elif "lite" in words:
        tier = "lite"
    elif "neo" in words:
        tier = "neo"

    # Model Number tokens (e.g., s24, s23, a55, a35, 15, 14, 13, 60x, 60, c53, c55, etc.)
    model_ids = set()
    for w in words:
        # Match standalone numbers (11..24, 50..70, etc.) or letter-digits (s24, a55, g84, m34, 60x)
        if re.match(r"^[a-z]?\d{1,3}[a-z]?$", w) and w != storage and w != ram and w != size and w not in EXCLUDED_MODEL_TERMS:
            model_ids.add(w)

    # Panel technology
    panel = None
    if "oled" in words:
        panel = "oled"
    elif "qned" in words:
        panel = "qned"
    elif "qled" in words:
        panel = "qled"

    # Clean tokens
    cleaned = [
        w for w in words
        if len(w) > 1 and w not in COMMON_STOP_WORDS and w != brand
        and not re.match(r"^\d+(?:gb|tb|ram|mm|cm|inch)$", w)
    ]

    return {
        "brand": brand,
        "storage": storage,
        "ram": ram,
        "size": size,
        "tier": tier,
        "panel": panel,
        "model_ids": model_ids,
        "tokens": cleaned,
        "raw_clean": clean,
    }


class ProductMatcher:
    def __init__(self, high_confidence_threshold: float = 0.85, review_threshold: float = 0.50):
        self.high_threshold = high_confidence_threshold
        self.review_threshold = review_threshold
        self.review_queue: List[Dict[str, Any]] = []
        self._init_mock_review_queue()

    def _init_mock_review_queue(self):
        """Initial seed entries for Admin Review Queue demonstrations."""
        self.review_queue = [
            {
                "id": "rev-001",
                "title_a": "Realme 12 Pro 5G (Submarine Blue 128GB)",
                "title_b": "Realme 12 Pro+ 5G (Submarine Blue 128GB)",
                "brand": "realme",
                "confidence_score": 0.78,
                "stage": "SPEC_SIMILARITY",
                "reason": "Sub-model difference detected ('12 Pro' vs '12 Pro+'). Camera specs differ.",
                "status": "PENDING",
                "created_at": datetime.utcnow().isoformat(),
            },
            {
                "id": "rev-002",
                "title_a": "Apple iPhone 15 128GB Black",
                "title_b": "Apple iPhone 15 Plus 128GB Black",
                "brand": "apple",
                "confidence_score": 0.74,
                "stage": "SPEC_SIMILARITY",
                "reason": "Screen size and battery variant mismatch ('iPhone 15' vs 'iPhone 15 Plus').",
                "status": "PENDING",
                "created_at": datetime.utcnow().isoformat(),
            },
            {
                "id": "rev-003",
                "title_a": "OnePlus 12 5G (Silky Black, 256GB)",
                "title_b": "OnePlus 12R 5G (Iron Gray, 256GB)",
                "brand": "oneplus",
                "confidence_score": 0.72,
                "stage": "SPEC_SIMILARITY",
                "reason": "Flagship vs R-series distinction ('OnePlus 12' vs 'OnePlus 12R').",
                "status": "PENDING",
                "created_at": datetime.utcnow().isoformat(),
            }
        ]

    def match(
        self,
        title_a: str,
        title_b: str,
        barcode_a: Optional[str] = None,
        barcode_b: Optional[str] = None,
        brand_hint_a: Optional[str] = None,
        brand_hint_b: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Executes multi-stage matching pipeline:
        1. Barcode match
        2. Model number & spec check
        3. Embedding similarity with brand/spec guards
        """
        # ─── Stage 1: Barcode Check ──────────────────────────────────────────
        if barcode_a and barcode_b:
            b_a = str(barcode_a).strip()
            b_b = str(barcode_b).strip()
            if b_a and b_b:
                if b_a == b_b:
                    return {
                        "is_match": True,
                        "confidence": 1.0,
                        "stage": "BARCODE",
                        "status": "AUTO_MERGED",
                        "reason": f"Exact barcode match ({b_a}).",
                    }
                else:
                    return {
                        "is_match": False,
                        "confidence": 0.0,
                        "stage": "BARCODE_CONFLICT",
                        "status": "REJECTED",
                        "reason": f"Conflicting barcodes ({b_a} != {b_b}).",
                    }

        # ─── Stage 2: Attribute & Spec Checks ────────────────────────────────
        attr_a = extract_attributes(title_a, brand_hint_a)
        attr_b = extract_attributes(title_b, brand_hint_b)

        # Brand mismatch guard
        if attr_a["brand"] and attr_b["brand"] and attr_a["brand"] != attr_b["brand"]:
            return {
                "is_match": False,
                "confidence": 0.0,
                "stage": "BRAND_MISMATCH",
                "status": "REJECTED",
                "reason": f"Incompatible brands ({attr_a['brand']} != {attr_b['brand']}).",
            }

        # Hardware Spec guards
        if attr_a["storage"] and attr_b["storage"] and attr_a["storage"] != attr_b["storage"]:
            return {
                "is_match": False,
                "confidence": 0.15,
                "stage": "SPEC_MISMATCH",
                "status": "REJECTED",
                "reason": f"Conflicting storage variants ({attr_a['storage']} != {attr_b['storage']}).",
            }

        if attr_a["size"] and attr_b["size"] and attr_a["size"] != attr_b["size"]:
            return {
                "is_match": False,
                "confidence": 0.15,
                "stage": "SPEC_MISMATCH",
                "status": "REJECTED",
                "reason": f"Conflicting display/chassis sizes ({attr_a['size']} != {attr_b['size']}).",
            }

        if attr_a.get("panel") and attr_b.get("panel") and attr_a["panel"] != attr_b["panel"]:
            return {
                "is_match": False,
                "confidence": 0.15,
                "stage": "PANEL_MISMATCH",
                "status": "REJECTED",
                "reason": f"Conflicting display panel technologies ({attr_a['panel']} != {attr_b['panel']}).",
            }

        # Model number / generation guard (e.g. s24 vs s23, 15 vs 14, a55 vs a35, 60x vs 60)
        disjoint_models = attr_a["model_ids"] and attr_b["model_ids"] and not (attr_a["model_ids"] & attr_b["model_ids"])
        if disjoint_models:
            return {
                "is_match": False,
                "confidence": 0.20,
                "stage": "MODEL_MISMATCH",
                "status": "REJECTED",
                "reason": f"Different model series/generation detected ({attr_a['model_ids']} vs {attr_b['model_ids']}).",
            }

        # Model Tier Modifier guard (e.g. Pro vs Pro+, Plus vs Standard, Ultra vs Base)
        tier_mismatch = (attr_a["tier"] is not None or attr_b["tier"] is not None) and (attr_a["tier"] != attr_b["tier"])

        # ─── Stage 3: Embedding & Token Similarity ───────────────────────────
        tokens_a = set(attr_a["tokens"])
        tokens_b = set(attr_b["tokens"])

        jaccard = len(tokens_a & tokens_b) / len(tokens_a | tokens_b) if (tokens_a and tokens_b) else 0.0
        embedding_sim = vector_engine.compute_similarity(title_a, title_b)

        # Weighted composite score
        score = (embedding_sim * 0.45) + (jaccard * 0.35)

        if attr_a["brand"] and attr_a["brand"] == attr_b["brand"]:
            score += 0.15
        if attr_a["storage"] and attr_a["storage"] == attr_b["storage"]:
            score += 0.10
        if attr_a["size"] and attr_a["size"] == attr_b["size"]:
            score += 0.15

        final_confidence = min(1.0, max(0.0, round(score, 4)))

        # Tier mismatch caps confidence below auto-merge threshold (routes to review queue)
        if tier_mismatch:
            final_confidence = min(final_confidence, 0.75)

        # ─── Decision & Review Queue Routing ─────────────────────────────────
        if final_confidence >= self.high_threshold:
            return {
                "is_match": True,
                "confidence": final_confidence,
                "stage": "EMBEDDING_SPEC_MATCH",
                "status": "AUTO_MERGED",
                "reason": f"High confidence similarity score ({final_confidence:.2f} >= {self.high_threshold}).",
            }
        elif final_confidence >= self.review_threshold:
            queue_item = {
                "id": f"rev-{len(self.review_queue) + 1:03d}",
                "title_a": title_a,
                "title_b": title_b,
                "brand": attr_a["brand"],
                "confidence_score": final_confidence,
                "stage": "LOW_CONFIDENCE_SIMILARITY",
                "reason": f"Confidence score ({final_confidence:.2f}) below auto-merge threshold ({self.high_threshold}). Queued for admin verification.",
                "status": "PENDING",
                "created_at": datetime.utcnow().isoformat(),
            }
            self.review_queue.append(queue_item)
            return {
                "is_match": False,
                "confidence": final_confidence,
                "stage": "LOW_CONFIDENCE_REVIEW",
                "status": "PENDING_ADMIN_REVIEW",
                "review_id": queue_item["id"],
                "reason": queue_item["reason"],
            }
        else:
            return {
                "is_match": False,
                "confidence": final_confidence,
                "stage": "LOW_SIMILARITY",
                "status": "REJECTED",
                "reason": f"Low match score ({final_confidence:.2f} < {self.review_threshold}).",
            }

    def get_review_queue(self, status: Optional[str] = None) -> List[Dict[str, Any]]:
        if status:
            return [q for q in self.review_queue if q["status"] == status]
        return self.review_queue

    def review_item(self, queue_id: str, action: str) -> Optional[Dict[str, Any]]:
        act = action.upper()
        if act not in ("APPROVED", "REJECTED"):
            return None
        item = next((q for q in self.review_queue if q["id"] == queue_id), None)
        if item:
            item["status"] = act
            item["reviewed_at"] = datetime.utcnow().isoformat()
            return item
        return None


product_matcher = ProductMatcher(high_confidence_threshold=0.85, review_threshold=0.50)


# Backward-compatible helper
def calculate_match_score(title_a: str, title_b: str) -> float:
    res = product_matcher.match(title_a, title_b)
    return res["confidence"]
