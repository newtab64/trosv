from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
def health() -> dict[str, str]:
    """Health check endpoint confirming AI service availability."""
    return {"status": "ok"}
