from __future__ import annotations

import uuid

from src.core.config import Settings
from src.domain.payments import PaymentRequest, PaymentResult


class MercadoPagoService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def create_payment(self, request: PaymentRequest) -> PaymentResult:
        # White label seguro: modo mock por padrao ate credenciais reais serem configuradas.
        if self.settings.checkout_mock_mode or not self.settings.mercadopago_access_token:
            return PaymentResult(
                gateway="mercadopago",
                status="approved_mock",
                amount=request.amount,
                payment_id=f"mp_mock_{uuid.uuid4().hex[:10]}",
                raw={"mode": "mock", "reason": "missing_credentials_or_mock_mode"},
            )

        return PaymentResult(
            gateway="mercadopago",
            status="pending",
            amount=request.amount,
            payment_id=f"mp_{uuid.uuid4().hex[:10]}",
            raw={"mode": "live_stub"},
        )
