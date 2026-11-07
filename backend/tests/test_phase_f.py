import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_telegram_code_generation():
    """Verify generation of 6-digit one-time code for Telegram linking."""
    resp = client.post("/api/alerts/telegram/code", json={"email": "gokul.shopper@example.com"})
    assert resp.status_code == 200
    data = resp.json()
    assert "code" in data
    assert len(data["code"]) == 6
    assert data["code"].isdigit()
    assert "deep_link" in data
    assert "t.me" in data["deep_link"]


def test_telegram_link_verification():
    """Verify linking Telegram chat ID using generated 6-digit code."""
    # First generate code
    code_resp = client.post("/api/alerts/telegram/code", json={"email": "gokul.verify@example.com"})
    assert code_resp.status_code == 200
    code = code_resp.json()["code"]

    # Now link with code
    link_resp = client.post(
        "/api/alerts/telegram/link",
        json={"chat_id": "987654321", "code": code},
    )
    assert link_resp.status_code == 200
    link_data = link_resp.json()
    assert link_data["success"] is True
    assert link_data["email"] == "gokul.verify@example.com"
    assert link_data["chat_id"] == "987654321"


def test_telegram_invalid_code():
    """Verify rejection of invalid Telegram link code."""
    link_resp = client.post(
        "/api/alerts/telegram/link",
        json={"chat_id": "987654321", "code": "000000"},
    )
    assert link_resp.status_code == 400


def test_telegram_test_alert_dispatch():
    """Verify dispatching test price-drop alert via Telegram service with console fallback."""
    resp = client.post(
        "/api/alerts/telegram/test",
        json={
            "product_id": "mob-001",
            "chat_id": "987654321",
            "target_price": 23000,
            "email": "gokul@example.com",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "DISPATCHED"
    assert data["channel"] == "TELEGRAM"
    assert "product_name" in data
    assert "current_price" in data


def test_telegram_alert_history():
    """Verify retrieving Telegram notification history."""
    # Ensure at least one alert is dispatched
    client.post(
        "/api/alerts/telegram/test",
        json={
            "product_id": "mob-001",
            "chat_id": "987654321",
            "target_price": 23000,
            "email": "gokul@example.com",
        },
    )

    resp = client.get("/api/alerts/telegram/history")
    assert resp.status_code == 200
    data = resp.json()
    assert "total" in data
    assert "alerts" in data
    assert data["total"] >= 1
