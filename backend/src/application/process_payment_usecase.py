from __future__ import annotations

from typing import Any, Dict

from src.domain.payments import PaymentRequest
from src.infrastructure.mercadopago_service import MercadoPagoService
from src.infrastructure.payment_repository import PaymentRepository
from src.infrastructure.stripe_service import StripeService


class ProcessPaymentUseCase:
    def __init__(
        self,
        repository: PaymentRepository,
        mercadopago_service: MercadoPagoService,
        stripe_service: StripeService,
    ) -> None:
        self.repository = repository
        self.mercadopago_service = mercadopago_service
        self.stripe_service = stripe_service

    def execute(self, request: PaymentRequest, gateway_hint: str) -> Dict[str, Any]:
        gateway = (gateway_hint or "").strip().lower()

        if gateway == "stripe":
            result = self.stripe_service.create_payment(request)
        else:
            result = self.mercadopago_service.create_payment(request)

        order_id = self.repository.create_order(gateway=result.gateway, request=request, result=result)
        result.order_id = order_id

        return {
            "ok": True,
            "order_id": order_id,
            "payment_id": result.payment_id,
            "payment_status": result.status,
            "gateway": result.gateway,
            "amount": result.amount,
            "redirect_url": result.redirect_url,
        }

    def save_draft(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        return self.repository.save_draft(payload)

    def get_status(self, order_id: str) -> Dict[str, Any]:
        return self.repository.get_order_status(order_id)
