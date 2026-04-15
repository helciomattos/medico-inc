from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.core.config import get_settings
from src.presentation.api_v1.routes_checkout import router as checkout_router
from src.presentation.api_v1.routes_health import router as health_router

settings = get_settings()

app = FastAPI(
    title="Seu Site Medico Checkout API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(checkout_router)


@app.get("/")
def root() -> dict:
    return {
        "ok": True,
        "service": "seu-site-medico-checkout-api",
        "docs": "/docs",
    }
