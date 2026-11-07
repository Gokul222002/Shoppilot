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


def test_api_search_endpoint():
    response = client.get('/api/search?q=phone')
    assert response.status_code == 200
    data = response.json()
    assert 'results' in data
    assert data['total'] > 0

def test_api_search_category_filter():
    response = client.get('/api/search?category=laptops')
    assert response.status_code == 200
    data = response.json()
    for item in data['results']:
        assert item['category'] == 'laptops'

def test_api_trending_products():
    response = client.get('/api/products/trending?limit=5')
    assert response.status_code == 200
    data = response.json()
    assert len(data['results']) <= 5

def test_api_single_product_detail():
    response = client.get('/api/products/ph-001')
    assert response.status_code == 200
    data = response.json()
    assert data['id'] == 'ph-001'
    assert 'price_history' in data


def test_create_and_list_price_alert():
    payload = {
        'product_id': 'ph-001',
        'product_name': 'Apple iPhone 15',
        'email': 'gokul@example.com',
        'target_price': 60000,
        'current_price': 65999
    }
    resp = client.post('/api/alerts', json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data['status'] in ('CREATED', 'UPDATED')
    alert_id = data['alert']['id']

    # List alerts for email
    list_resp = client.get('/api/alerts?email=gokul@example.com')
    assert list_resp.status_code == 200
    alerts = list_resp.json()['alerts']
    assert any(a['id'] == alert_id for a in alerts)

def test_check_price_alerts_worker():
    # Set target price above current best_price to trigger
    payload = {
        'product_id': 'ph-001',
        'product_name': 'Apple iPhone 15',
        'email': 'gokul_alert@example.com',
        'target_price': 70000,
        'current_price': 65999
    }
    client.post('/api/alerts', json=payload)
    check_resp = client.post('/api/alerts/check')
    assert check_resp.status_code == 200
    result = check_resp.json()
    assert result['status'] == 'CHECK_COMPLETE'
    assert result['triggered_count'] >= 1


def test_api_assistant_endpoint():
    resp = client.post('/api/assistant', json={'query': 'Find me a phone under 35000 with 5G'})
    assert resp.status_code == 200
    data = resp.json()
    assert 'response' in data
    assert 'products' in data
    assert data['budget'] == 35000
    assert len(data['products']) > 0
