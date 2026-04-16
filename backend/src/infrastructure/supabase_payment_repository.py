from __future__ import annotations

import json
import threading
import uuid
from dataclasses import asdict
from datetime import datetime, timezone
from typing import Any, Dict
from urllib import error, request

from src.core.config import Settings
from src.domain.payments import PaymentRequest, PaymentResult


class SupabasePaymentRepository:
    def __init__(self, settings: Settings, fallback_repository: Any | None = None) -> None:
        self.settings = settings
        self.fallback_repository = fallback_repository
        self._lock = threading.Lock()

    def _headers(self) -> Dict[str, str]:
        return {
            "Content-Type": "application/json",
            "apikey": self.settings.supabase_service_role_key,
            "Authorization": f"Bearer {self.settings.supabase_service_role_key}",
            "Prefer": "return=representation",
        }

    def _endpoint(self, table: str) -> str:
        base = self.settings.supabase_url.rstrip("/")
        return f"{base}/rest/v1/{table}"

    def _insert(self, table: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        body = json.dumps(payload).encode("utf-8")
        req = request.Request(self._endpoint(table), data=body, headers=self._headers(), method="POST")

        try:
            with request.urlopen(req, timeout=10) as response:
                raw = response.read().decode("utf-8")
                parsed = json.loads(raw) if raw else []
                if isinstance(parsed, list) and parsed:
                    return parsed[0]
                return {}
        except error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="ignore") if hasattr(exc, "read") else ""
            raise RuntimeError(f"Supabase HTTP {exc.code}: {detail or exc.reason}") from exc
        except error.URLError as exc:
            raise RuntimeError(f"Supabase network error: {exc.reason}") from exc

    def _select_order_status(self, order_id: str) -> Dict[str, Any]:
        headers = {
            "apikey": self.settings.supabase_service_role_key,
            "Authorization": f"Bearer {self.settings.supabase_service_role_key}",
            "Accept": "application/json",
        }
        params = f"select=order_id,gateway,status,amount,created_at&order_id=eq.{order_id}&limit=1"
        url = f"{self._endpoint(self.settings.supabase_orders_table)}?{params}"
        req = request.Request(url, headers=headers, method="GET")

        try:
            with request.urlopen(req, timeout=10) as response:
                raw = response.read().decode("utf-8")
                parsed = json.loads(raw) if raw else []
                if isinstance(parsed, list) and parsed:
                    return parsed[0]
                return {}
        except Exception as exc:  # noqa: BLE001
            raise RuntimeError(f"Supabase read status failed: {exc}") from exc

    def create_order(self, gateway: str, request: PaymentRequest, result: PaymentResult) -> str:
        order_id = f"MI-{uuid.uuid4().hex[:10].upper()}"
        row = {
            "order_id": order_id,
            "gateway": gateway,
            "status": result.status,
            "amount": result.amount,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "payment_id": result.payment_id,
            "customer": asdict(request.customer),
            "utm_params": request.utm_params,
            "request_data": {
                "amount": request.amount,
                "payment_method": request.payment_method,
                "installments": request.installments,
                "idempotency_key": request.idempotency_key,
            },
        }

        try:
            self._insert(self.settings.supabase_orders_table, row)
            return order_id
        except Exception:  # noqa: BLE001
            if self.fallback_repository:
                return self.fallback_repository.create_order(gateway=gateway, request=request, result=result)
            raise

    def get_order_status(self, order_id: str) -> Dict[str, Any]:
        try:
            data = self._select_order_status(order_id)
            if not data:
                return {"order_id": order_id, "found": False, "status": "not_found"}
            return {
                "order_id": data.get("order_id", order_id),
                "found": True,
                "status": data.get("status", "unknown"),
                "gateway": data.get("gateway", "unknown"),
                "amount": data.get("amount", 0),
                "created_at": data.get("created_at"),
            }
        except Exception:  # noqa: BLE001
            if self.fallback_repository:
                return self.fallback_repository.get_order_status(order_id)
            raise

    def save_draft(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        draft_id = f"draft-{uuid.uuid4().hex[:10]}"
        row = {
            "draft_id": draft_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "payload": payload,
        }
        try:
            self._insert(self.settings.supabase_drafts_table, row)
            return {"draft_id": draft_id, "saved": True}
        except Exception:  # noqa: BLE001
            if self.fallback_repository:
                return self.fallback_repository.save_draft(payload)
            raise
