from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict:
    return {"ok": True, "service": "checkout-api", "version": "1.0.0"}
