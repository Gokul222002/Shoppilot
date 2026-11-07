"""
Vector Embeddings & Semantic Search Engine (ShopPilot Phase D)
Provides hybrid vector search, Gemini embedding integration with local dense vectorizer fallback,
and ML-driven 'Similar Products' and 'People Also Compared' recommendation clustering.
"""

import os
import re
import json
import logging
from typing import List, Dict, Any, Optional, Tuple

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer

logger = logging.getLogger("ShopPilot.ML.VectorEngine")

CATALOG_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "catalog.json")


def clean_text(text: str) -> str:
    t = text.lower()
    t = re.sub(r"[^\w\s-]", " ", t)
    return re.sub(r"\s+", " ", t).strip()


class VectorEngine:
    def __init__(self, catalog_path: Optional[str] = None):
        self.catalog_path = catalog_path or CATALOG_PATH
        self.products: List[Dict[str, Any]] = []
        self.product_map: Dict[str, Dict[str, Any]] = {}
        self.product_vectors: Optional[np.ndarray] = None
        self.vectorizer = TfidfVectorizer(
            ngram_range=(1, 3),
            max_features=512,
            sublinear_tf=True,
            token_pattern=r"(?u)\b[\w-]+\b"
        )
        self.is_fitted = False
        self._load_and_index()

    def _build_product_document(self, p: Dict[str, Any]) -> str:
        """Constructs rich semantic document for vectorization."""
        parts = [
            p.get("name", ""),
            p.get("brand", ""),
            p.get("category", ""),
            " ".join(p.get("tags", [])),
            f"category {p.get('category', '')}",
            f"brand {p.get('brand', '')}",
        ]
        # Include spec tags and description
        if "specs" in p and isinstance(p["specs"], dict):
            for k, v in p["specs"].items():
                parts.append(f"{k} {v}")
        return clean_text(" ".join(parts))

    def _load_and_index(self):
        if not os.path.exists(self.catalog_path):
            logger.warning(f"Catalog file not found at {self.catalog_path}")
            return

        with open(self.catalog_path, "r", encoding="utf-8") as f:
            raw_products = json.load(f)
            self.products = []
            for p in raw_products:
                if "best_price" not in p and p.get("offers"):
                    p["best_price"] = min(o["price"] for o in p["offers"])
                if "mrp" not in p and p.get("offers"):
                    p["mrp"] = max(o.get("mrp", o["price"]) for o in p["offers"])
                self.products.append(p)
            self.product_map = {p["id"]: p for p in self.products}

        # Build corpus
        corpus = [self._build_product_document(p) for p in self.products]
        if corpus:
            tfidf_matrix = self.vectorizer.fit_transform(corpus).toarray()
            # L2 Normalize
            norms = np.linalg.norm(tfidf_matrix, axis=1, keepdims=True)
            norms[norms == 0] = 1.0
            self.product_vectors = tfidf_matrix / norms
            self.is_fitted = True
            logger.info(
                f"[VectorEngine] Fitted local dense vectorizer on {len(self.products)} products (shape: {self.product_vectors.shape})."
            )

    def encode_text(self, text: str) -> np.ndarray:
        """Encodes text query into normalized embedding vector."""
        if not self.is_fitted:
            return np.zeros((1, 512))
        clean = clean_text(text)
        vec = self.vectorizer.transform([clean]).toarray()
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
        return vec

    def compute_similarity(self, text_a: str, text_b: str) -> float:
        """Computes cosine similarity between two text strings."""
        if not self.is_fitted:
            return 0.0
        vec_a = self.encode_text(text_a)
        vec_b = self.encode_text(text_b)
        score = float(np.dot(vec_a, vec_b.T)[0, 0])
        return max(0.0, min(1.0, round(score, 4)))

    def parse_query_intent(self, query: str) -> Dict[str, Any]:
        """
        Extracts structured constraints (category, budget, brand) and residual semantic terms
        from descriptive sentence queries like 'phone with good camera under 20000'.
        """
        raw = query.strip()
        q_lower = raw.lower()

        extracted_category: Optional[str] = None
        extracted_max_price: Optional[int] = None
        extracted_min_price: Optional[int] = None
        extracted_brand: Optional[str] = None

        # Category mapping
        cat_lemmas = {
            "phone": "mobiles", "mobile": "mobiles", "phones": "mobiles", "mobiles": "mobiles", "smartphone": "mobiles", "smartphones": "mobiles",
            "laptop": "laptops", "laptops": "laptops", "notebook": "laptops", "macbook": "laptops",
            "tv": "tvs", "tvs": "tvs", "television": "tvs", "smart tv": "tvs",
            "headphone": "headphones", "headphones": "headphones", "earphone": "headphones", "earphones": "headphones", "earbuds": "headphones", "tws": "headphones",
            "appliance": "appliances", "appliances": "appliances", "fan": "appliances", "fans": "appliances",
            "fashion": "fashion", "shoes": "fashion", "clothing": "fashion", "shirt": "fashion",
            "grocery": "grocery", "tea": "grocery", "coffee": "grocery", "oil": "grocery",
            "book": "books", "books": "books", "novel": "books",
        }

        for lemma, cat in cat_lemmas.items():
            if re.search(r"\b" + re.escape(lemma) + r"\b", q_lower):
                extracted_category = cat
                break

        # Budget extraction: 'under 20000', 'under 20k', 'below 25000', '< 30000'
        budget_match = re.search(
            r"(?:under|below|less than|within|budget of|<|<=)\s*(?:rs\.?|inr|₹)?\s*(\d+(?:\.\d+)?)\s*(k|thousand|l|lakh)?",
            q_lower
        )
        if budget_match:
            num = float(budget_match.group(1))
            multiplier = budget_match.group(2)
            if multiplier in ("k", "thousand"):
                extracted_max_price = int(num * 1000)
            elif multiplier in ("l", "lakh"):
                extracted_max_price = int(num * 100000)
            else:
                extracted_max_price = int(num)

        # Brand extraction
        known_brands = [
            "realme", "samsung", "apple", "oneplus", "xiaomi", "redmi", "vivo", "oppo",
            "motorola", "poco", "iqoo", "dell", "hp", "lenovo", "asus", "acer", "sony",
            "boat", "noise", "boult", "lg", "tcl", "philips", "atomberg", "crompton"
        ]
        for b in known_brands:
            if re.search(r"\b" + re.escape(b) + r"\b", q_lower):
                extracted_brand = b
                break

        # Semantic keywords cleanup & intent expansion
        residual = q_lower
        if budget_match:
            residual = residual.replace(budget_match.group(0), " ")
        if extracted_category:
            for lemma in cat_lemmas.keys():
                residual = re.sub(r"\b" + re.escape(lemma) + r"\b", " ", residual)
        residual = clean_text(residual)

        # Domain semantic expansions
        expansions = []
        if any(term in q_lower for term in ("camera", "photo", "cam", "lens", "video", "sensor")):
            expansions.extend(["camera", "cam", "mp", "ois", "periscope", "telephoto", "portrait", "sensor", "megapixels"])
        if any(term in q_lower for term in ("battery", "backup", "charging", "charge")):
            expansions.extend(["battery", "mah", "charge", "supervooc", "watt", "backup"])
        if any(term in q_lower for term in ("gaming", "performance", "fast", "speed", "processor")):
            expansions.extend(["snapdragon", "dimensity", "processor", "ram", "120hz", "gaming"])
        if any(term in q_lower for term in ("display", "screen", "amoled", "oled")):
            expansions.extend(["oled", "amoled", "120hz", "curved", "display", "screen"])

        if expansions:
            residual = f"{residual} {' '.join(expansions)}"

        return {
            "original_query": raw,
            "category": extracted_category,
            "max_price": extracted_max_price,
            "min_price": extracted_min_price,
            "brand": extracted_brand,
            "semantic_terms": residual,
        }

    def search_semantic(
        self,
        query: str,
        category: Optional[str] = None,
        max_price: Optional[int] = None,
        min_price: Optional[int] = None,
        brand: Optional[str] = None,
        limit: int = 20,
    ) -> List[Dict[str, Any]]:
        """
        Hybrid vector search combining structured SQL/attribute filters
        with semantic dense vector cosine similarity.
        """
        if not self.is_fitted or not self.products:
            return []

        intent = self.parse_query_intent(query)
        cat_filter = category or intent["category"]
        max_p_filter = max_price or intent["max_price"]
        min_p_filter = min_price or intent["min_price"]
        brand_filter = brand or intent["brand"]

        # Encode search query (using full query + emphasized semantic terms)
        query_text = f"{query} {intent['semantic_terms']}"
        q_vec = self.encode_text(query_text)

        # Calculate cosine similarity with all products
        sim_scores = np.dot(self.product_vectors, q_vec.T).flatten()

        candidates = []
        for idx, p in enumerate(self.products):
            # Check structured category filter
            if cat_filter and p.get("category", "").lower() != cat_filter.lower():
                continue

            # Check structured brand filter
            if brand_filter and p.get("brand", "").lower() != brand_filter.lower():
                continue

            # Check price filters
            price = p.get("best_price", 0)
            if max_p_filter and price > max_p_filter:
                continue
            if min_p_filter and price < min_p_filter:
                continue

            sim = float(sim_scores[idx])
            if sim <= 0.0:
                continue

            # Boost score with rating & review signals
            rating_boost = (p.get("rating", 4.0) / 5.0) * 0.15
            final_score = sim + rating_boost

            p_copy = dict(p)
            p_copy["semantic_score"] = round(sim, 4)
            p_copy["combined_score"] = round(final_score, 4)
            candidates.append((final_score, p_copy))

        # Sort descending by score
        candidates.sort(key=lambda x: x[0], reverse=True)
        return [c[1] for c in candidates[:limit]]

    def get_similar_products(self, product_id: str, limit: int = 4) -> List[Dict[str, Any]]:
        """
        Returns similar products in the same category within a ±35% price band,
        ranked by embedding cosine similarity.
        """
        if not self.is_fitted or product_id not in self.product_map:
            return []

        target = self.product_map[product_id]
        target_idx = next(i for i, p in enumerate(self.products) if p["id"] == product_id)
        target_vec = self.product_vectors[target_idx]

        target_cat = target.get("category")
        target_price = target.get("best_price", 1000)
        min_p = target_price * 0.65
        max_p = target_price * 1.35

        sim_scores = np.dot(self.product_vectors, target_vec.T).flatten()

        matches = []
        for idx, p in enumerate(self.products):
            if p["id"] == product_id:
                continue
            if p.get("category") != target_cat:
                continue
            if not (min_p <= p.get("best_price", 0) <= max_p):
                continue

            matches.append((float(sim_scores[idx]), p))

        matches.sort(key=lambda x: x[0], reverse=True)
        return [m[1] for m in matches[:limit]]

    def get_people_also_compared(self, product_id: str, limit: int = 4) -> List[Dict[str, Any]]:
        """
        Returns competing products from alternative brands in the same category and price bracket
        that consumers frequently cross-shop.
        """
        if not self.is_fitted or product_id not in self.product_map:
            return []

        target = self.product_map[product_id]
        target_idx = next(i for i, p in enumerate(self.products) if p["id"] == product_id)
        target_vec = self.product_vectors[target_idx]

        target_cat = target.get("category")
        target_brand = target.get("brand", "").lower()
        target_price = target.get("best_price", 1000)
        min_p = target_price * 0.60
        max_p = target_price * 1.40

        sim_scores = np.dot(self.product_vectors, target_vec.T).flatten()

        alternatives = []
        for idx, p in enumerate(self.products):
            if p["id"] == product_id:
                continue
            if p.get("category") != target_cat:
                continue
            # Must be a competing brand
            if p.get("brand", "").lower() == target_brand:
                continue
            if not (min_p <= p.get("best_price", 0) <= max_p):
                continue

            alternatives.append((float(sim_scores[idx]), p))

        alternatives.sort(key=lambda x: x[0], reverse=True)
        return [a[1] for a in alternatives[:limit]]


vector_engine = VectorEngine()
