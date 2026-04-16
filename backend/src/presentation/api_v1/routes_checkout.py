from __future__ import annotations

from functools import lru_cache
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field

from src.application.process_payment_usecase import ProcessPaymentUseCase
from src.core.config import Settings, get_settings
from src.domain.payments import CustomerData, OrderBump, PaymentRequest
from src.infrastructure.mercadopago_service import MercadoPagoService
from src.infrastructure.payment_repository import InMemoryPaymentRepository, PaymentRepository
from src.infrastructure.stripe_service import StripeService
from src.infrastructure.supabase_payment_repository import SupabasePaymentRepository

router = APIRouter(prefix="/api/checkout", tags=["checkout"])


class CustomerPayload(BaseModel):
    name: str
    email: str
    phone: str = ""
    cpf: str = ""
    documentType: str = "CPF"
    companyName: Optional[str] = None


class BumpPayload(BaseModel):
    product_id: str
    quantity: int = 1
    amount: float = 0.0


class CheckoutPayload(BaseModel):
    amount: float = Field(..., gt=0)
    payment_method: str = "credit_card"
    idempotencyKey: str = ""
    installments: int = 1
    customer: CustomerPayload
    order_bumps: List[BumpPayload] = Field(default_factory=list)
    cardData: Dict[str, Any] = Field(default_factory=dict)
    utm_params: Dict[str, Any] = Field(default_factory=dict)


class SaveDraftPayload(BaseModel):
    payload: Dict[str, Any]


def _build_repository(settings: Settings) -> PaymentRepository:
    fallback_repository = InMemoryPaymentRepository()
    if settings.supabase_url and settings.supabase_service_role_key:
        return SupabasePaymentRepository(settings=settings, fallback_repository=fallback_repository)
    return fallback_repository


@lru_cache(maxsize=1)
def _get_usecase() -> ProcessPaymentUseCase:
    settings = get_settings()
    repository = _build_repository(settings)
    mp_service = MercadoPagoService(settings)
    stripe_service = StripeService(settings)
    return ProcessPaymentUseCase(repository, mp_service, stripe_service)


def _to_request(payload: CheckoutPayload) -> PaymentRequest:
    customer = CustomerData(
        name=payload.customer.name,
        email=payload.customer.email,
        phone=payload.customer.phone,
        cpf=payload.customer.cpf,
        document_type=payload.customer.documentType,
        company_name=payload.customer.companyName,
    )
    bumps = [
        OrderBump(product_id=item.product_id, quantity=item.quantity, amount=item.amount)
        for item in payload.order_bumps
    ]
    return PaymentRequest(
        amount=payload.amount,
        payment_method=payload.payment_method,
        customer=customer,
        installments=payload.installments,
        idempotency_key=payload.idempotencyKey,
        order_bumps=bumps,
        card_data=payload.cardData,
        utm_params=payload.utm_params,
    )


@router.post("/enterprise")
def create_mercadopago_checkout(payload: CheckoutPayload) -> Dict[str, Any]:
    usecase = _get_usecase()
    request = _to_request(payload)
    return usecase.execute(request, gateway_hint="mercadopago")


@router.post("/stripe")
def create_stripe_checkout(payload: CheckoutPayload) -> Dict[str, Any]:
    usecase = _get_usecase()
    request = _to_request(payload)
    return usecase.execute(request, gateway_hint="stripe")


@router.post("/save-draft")
def save_checkout_draft(payload: SaveDraftPayload) -> Dict[str, Any]:
    usecase = _get_usecase()
    return usecase.save_draft(payload.payload)


@router.get("/status")
def get_checkout_status(order_id: str = Query(..., min_length=5)) -> Dict[str, Any]:
    usecase = _get_usecase()
    return usecase.get_status(order_id)
