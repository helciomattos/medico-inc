from __future__ import annotations

import threading
import uuid
from dataclasses import asdict
from datetime import datetime, timezone
from typing import Any, Dict

from src.domain.payments import PaymentRequest, PaymentResult


class InMemoryPaymentRepository:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._orders: Dict[str, Dict[str, Any]] = {}
        self._drafts: Dict[str, Dict[str, Any]] = {}

    def create_order(self, gateway: str, request: PaymentRequest, result: PaymentResult) -> str:
        order_id = f"SM-{uuid.uuid4().hex[:10].upper()}"
        row = {
            "order_id": order_id,
            "gateway": gateway,
            "status": result.status,
            "amount": result.amount,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "payment_id": result.payment_id,
            "customer": asdict(request.customer),
            "utm_params": request.utm_params,
        }
        with self._lock:
            self._orders[order_id] = row
        return order_id

    def get_order_status(self, order_id: str) -> Dict[str, Any]:
        with self._lock:
            data = self._orders.get(order_id)
        if not data:
            return {"order_id": order_id, "found": False, "status": "not_found"}
        return {
            "order_id": order_id,
            "found": True,
            "status": data["status"],
            "gateway": data["gateway"],
            "amount": data["amount"],
            "created_at": data["created_at"],
        }

    def save_draft(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        draft_id = f"draft-{uuid.uuid4().hex[:10]}"
        with self._lock:
            self._drafts[draft_id] = {
                "draft_id": draft_id,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "payload": payload,
            }
        return {"draft_id": draft_id, "saved": True}
