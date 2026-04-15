from fastapi.testclient import TestClient

from src.main import app


def test_checkout_enterprise_contract() -> None:
    client = TestClient(app)
    response = client.post(
        "/api/checkout/enterprise",
        json={
            "amount": 497,
            "payment_method": "credit_card",
            "customer": {"name": "Dr Teste", "email": "dr@teste.com"},
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["ok"] is True
    assert "order_id" in data
    assert data["gateway"] == "mercadopago"
