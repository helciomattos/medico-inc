from __future__ import annotations

import uuid

from src.core.config import Settings
from src.domain.payments import PaymentRequest, PaymentResult


class StripeService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def create_payment(self, request: PaymentRequest) -> PaymentResult:
        # White label seguro: modo mock por padrao ate credenciais reais serem configuradas.
        if self.settings.checkout_mock_mode or not self.settings.stripe_secret_key:
            return PaymentResult(
                gateway="stripe",
                status="approved_mock",
                amount=request.amount,
                payment_id=f"st_mock_{uuid.uuid4().hex[:10]}",
                raw={"mode": "mock", "reason": "missing_credentials_or_mock_mode"},
            )

        return PaymentResult(
            gateway="stripe",
            status="pending",
            amount=request.amount,
            payment_id=f"st_{uuid.uuid4().hex[:10]}",
            raw={"mode": "live_stub"},
        )
