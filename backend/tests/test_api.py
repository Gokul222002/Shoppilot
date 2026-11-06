import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "ShopPilot" in data["app"]

def test_mock_store_html_render():
    response = client.get("/mock-store")
    assert response.status_code == 200
    assert "TRAILHEAD" in response.text
    assert "UltraView 27" in response.text
    assert "btn-search" in response.text

def test_mock_store_search_filter():
    response = client.get("/mock-store?q=monitor")
    assert response.status_code == 200
    assert "UltraView 27" in response.text

def test_create_and_list_job():
    response = client.post("/api/jobs", json={
        "objective": "Find a 4K 27-inch monitor under $300 and add to cart"
    })
    assert response.status_code == 200
    job_data = response.json()
    assert "job_id" in job_data
    assert job_data["status"] == "QUEUED"

    list_resp = client.get("/api/jobs")
    assert list_resp.status_code == 200
    assert any(j["id"] == job_data["job_id"] for j in list_resp.json()["jobs"])

def test_mock_webhook_endpoint():
    payload = {
        "event_type": "DEAL_FOUND",
        "title": "Monitor Deal",
        "message": "Found monitor for $279"
    }
    response = client.post("/api/webhook/mock", json=payload)
    assert response.status_code == 200
    assert response.json()["received"] is True
