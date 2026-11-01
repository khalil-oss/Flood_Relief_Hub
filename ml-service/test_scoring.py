from main import app
from fastapi.testclient import TestClient

client = TestClient(app)


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_assess_normal():
    payload = {
        "camp": {"id": "c1", "name": "Camp", "capacity": 100, "current_families": 90, "status": "Active"},
        "needs": [{"id": "n1", "required_quantity": 100, "fulfilled_quantity": 20, "priority": "High"}],
        "inventory": {"item-1": {"stock": 5, "reorder_level": 10}},
        "dispatches": [{"id": "d1", "quantity": 10, "status": "Pending"}],
    }
    r = client.post("/assess", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert 0 <= data["score"] <= 100
    assert data["risk_level"] in ("Low", "Medium", "High", "Critical")


def test_zero_capacity():
    payload = {"camp": {"capacity": 0, "current_families": 5}, "needs": [], "inventory": {}, "dispatches": []}
    r = client.post("/assess", json=payload)
    assert r.status_code == 200
    assert any("capacity" in w.lower() for w in r.json()["warnings"])


def test_missing_data():
    payload = {"camp": {}, "needs": [], "inventory": {}, "dispatches": []}
    r = client.post("/assess", json=payload)
    assert r.status_code == 200
