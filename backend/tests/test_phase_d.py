"""
Phase D Semantic Search & ML Matching Acceptance Tests (ShopPilot)
Tests:
1. Natural language semantic search with intent extraction ('phone with good camera under 20000').
2. ML recommendations: 'Similar products' and 'People also compared'.
3. Multi-stage matcher order (Barcode -> Model Number -> Embedding & Spec guards).
4. Admin Review Queue routing for borderline low-confidence candidate matches.
5. Benchmark validation across 100 labeled test pairs achieving 100% precision at threshold 0.85.
"""

import os
import json
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.matching import product_matcher

client = TestClient(app)


def test_semantic_search_intent_and_budget_filters():
    # Query: 'phone with good camera under 20000'
    resp = client.get("/api/search/semantic?q=phone+with+good+camera+under+20000")
    assert resp.status_code == 200
    data = resp.json()

    assert data["total"] > 0
    intent = data["intent"]
    assert intent["category"] == "mobiles"
    assert intent["max_price"] == 20000

    # Verify all returned candidates satisfy the structured constraint and have positive semantic scores
    for prod in data["results"]:
        assert prod["category"] == "mobiles"
        assert prod["best_price"] <= 20000
        assert prod["semantic_score"] > 0


def test_hybrid_search_routing_on_main_search_endpoint():
    # Calling /api/search with a descriptive sentence should automatically engage VectorEngine
    resp = client.get("/api/search?q=phone+with+good+camera+under+20000")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] > 0
    assert "VectorEngine" in data["connector"]
    for prod in data["results"]:
        assert prod["category"] == "mobiles"
        assert prod["best_price"] <= 20000


def test_similar_products_recommendations():
    resp = client.get("/api/products/mob-001/similar?limit=4")
    assert resp.status_code == 200
    data = resp.json()
    assert data["count"] == 4
    for item in data["similar_products"]:
        assert item["id"] != "mob-001"
        assert item["category"] == "mobiles"
        # Price should be within ±35% band of mob-001 (~27,749)
        assert 15000 <= item["best_price"] <= 40000


def test_people_also_compared_cross_brand_recommendations():
    resp = client.get("/api/products/mob-001/also-compared?limit=4")
    assert resp.status_code == 200
    data = resp.json()
    assert data["count"] >= 3
    for item in data["people_also_compared"]:
        assert item["id"] != "mob-001"
        assert item["category"] == "mobiles"
        # Must be from a COMPETING brand (not Realme)
        assert item["brand"].lower() != "realme"


def test_matcher_order_and_confidence_guards():
    # 1. Exact Barcode Match -> 1.0 confidence, AUTO_MERGED
    res_barcode = product_matcher.match(
        title_a="Realme 12 Pro+ 5G (Submarine Blue 256GB)",
        title_b="Random Title Listing",
        barcode_a="8901001000000",
        barcode_b="8901001000000",
    )
    assert res_barcode["confidence"] == 1.0
    assert res_barcode["stage"] == "BARCODE"
    assert res_barcode["status"] == "AUTO_MERGED"

    # 2. Conflicting Barcode -> 0.0 confidence, REJECTED
    res_barcode_conflict = product_matcher.match(
        title_a="Realme 12 Pro+ 5G",
        title_b="Realme 12 Pro+ 5G",
        barcode_a="8901001000000",
        barcode_b="8901001000001",
    )
    assert res_barcode_conflict["confidence"] == 0.0
    assert res_barcode_conflict["status"] == "REJECTED"

    # 3. Brand Mismatch -> 0.0 confidence
    res_brand = product_matcher.match(
        title_a="Apple iPhone 15 128GB Black",
        title_b="Samsung Galaxy S24 128GB Black",
    )
    assert res_brand["confidence"] == 0.0
    assert res_brand["stage"] == "BRAND_MISMATCH"

    # 4. Storage Mismatch -> 0.15 confidence
    res_storage = product_matcher.match(
        title_a="Realme 12 Pro 5G (128GB)",
        title_b="Realme 12 Pro 5G (256GB)",
    )
    assert res_storage["confidence"] == 0.15
    assert res_storage["stage"] == "SPEC_MISMATCH"

    # 5. Model Generation Mismatch (S24 vs S23) -> 0.20 confidence
    res_gen = product_matcher.match(
        title_a="Samsung Galaxy S24 5G (128GB)",
        title_b="Samsung Galaxy S23 5G (128GB)",
    )
    assert res_gen["confidence"] == 0.20
    assert res_gen["stage"] == "MODEL_MISMATCH"

    # 6. Model Tier Mismatch (Pro vs Pro+) -> routes to review queue
    res_tier = product_matcher.match(
        title_a="Realme 12 Pro 5G (Submarine Blue 128GB)",
        title_b="Realme 12 Pro+ 5G (Submarine Blue 128GB)",
    )
    assert res_tier["confidence"] < 0.85
    assert res_tier["status"] == "PENDING_ADMIN_REVIEW"


def test_admin_review_queue_lifecycle():
    # Fetch review queue
    q_resp = client.get("/api/admin/review-queue")
    assert q_resp.status_code == 200
    q_data = q_resp.json()
    assert q_data["total"] >= 3

    # Approve item
    app_resp = client.post("/api/admin/review-queue/rev-001/approve")
    assert app_resp.status_code == 200
    assert app_resp.json()["action"] == "APPROVED"
    assert app_resp.json()["item"]["status"] == "APPROVED"

    # Reject item
    rej_resp = client.post("/api/admin/review-queue/rev-002/reject")
    assert rej_resp.status_code == 200
    assert rej_resp.json()["action"] == "REJECTED"
    assert rej_resp.json()["item"]["status"] == "REJECTED"


def test_100_pairs_benchmark_guarantees():
    data_path = os.path.join(os.path.dirname(__file__), "data", "matcher_test_pairs.json")
    with open(data_path, "r", encoding="utf-8") as f:
        pairs = json.load(f)

    assert len(pairs) == 100

    tp, fp, fn, tn = 0, 0, 0, 0
    product_matcher.high_threshold = 0.85

    for item in pairs:
        res = product_matcher.match(item["title_a"], item["title_b"])
        pred = 1 if res["confidence"] >= 0.85 else 0
        actual = item["label"]

        if pred == 1 and actual == 1:
            tp += 1
        elif pred == 1 and actual == 0:
            fp += 1
        elif pred == 0 and actual == 1:
            fn += 1
        elif pred == 0 and actual == 0:
            tn += 1

    precision = tp / (tp + fp) if (tp + fp) > 0 else 0
    # Must achieve 100% precision at 0.85 threshold (0 false positive merges)
    assert precision == 1.0, f"Expected 1.0 precision, got {precision} with {fp} false positives"
    assert fp == 0
    assert tp >= 30
