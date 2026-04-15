from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class CustomerData:
    name: str
    email: str
    phone: str = ""
    cpf: str = ""
    document_type: str = "CPF"
    company_name: Optional[str] = None


@dataclass
class OrderBump:
    product_id: str
    quantity: int = 1
    amount: float = 0.0


@dataclass
class PaymentRequest:
    amount: float
    payment_method: str
    customer: CustomerData
    installments: int = 1
    idempotency_key: str = ""
    order_bumps: List[OrderBump] = field(default_factory=list)
    card_data: Dict[str, Any] = field(default_factory=dict)
    utm_params: Dict[str, Any] = field(default_factory=dict)


@dataclass
class PaymentResult:
    gateway: str
    status: str
    amount: float
    payment_id: str
    order_id: str = ""
    redirect_url: Optional[str] = None
    raw: Dict[str, Any] = field(default_factory=dict)
