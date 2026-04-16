from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache
from typing import List

from dotenv import load_dotenv

load_dotenv()


def _to_bool(raw: str | None, default: bool) -> bool:
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _split_csv(raw: str | None) -> List[str]:
    if not raw:
        return ["*"]
    return [item.strip() for item in raw.split(",") if item.strip()]


@dataclass(frozen=True)
class Settings:
    app_env: str
    app_port: int
    cors_origins: List[str]

    checkout_mock_mode: bool

    mercadopago_access_token: str
    mercadopago_public_key: str

    stripe_secret_key: str
    stripe_publishable_key: str

    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str
    supabase_orders_table: str
    supabase_drafts_table: str

    checkout_success_url: str
    checkout_failure_url: str


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings(
        app_env=os.getenv("APP_ENV", "development"),
        app_port=int(os.getenv("APP_PORT", "8787")),
        cors_origins=_split_csv(os.getenv("CORS_ORIGINS")),
        checkout_mock_mode=_to_bool(os.getenv("CHECKOUT_MOCK_MODE"), True),
        mercadopago_access_token=os.getenv("MERCADOPAGO_ACCESS_TOKEN", ""),
        mercadopago_public_key=os.getenv("MERCADOPAGO_PUBLIC_KEY", ""),
        stripe_secret_key=os.getenv("STRIPE_SECRET_KEY", ""),
        stripe_publishable_key=os.getenv("STRIPE_PUBLISHABLE_KEY", ""),
        supabase_url=os.getenv("SUPABASE_URL", ""),
        supabase_anon_key=os.getenv("SUPABASE_ANON_KEY", ""),
        supabase_service_role_key=os.getenv("SUPABASE_SERVICE_ROLE_KEY", ""),
        supabase_orders_table=os.getenv("SUPABASE_ORDERS_TABLE", "checkout_orders"),
        supabase_drafts_table=os.getenv("SUPABASE_DRAFTS_TABLE", "checkout_drafts"),
        checkout_success_url=os.getenv("CHECKOUT_SUCCESS_URL", "https://seusitemedico.com.br/obrigado"),
        checkout_failure_url=os.getenv("CHECKOUT_FAILURE_URL", "https://seusitemedico.com.br/checkout"),
    )
