# ============================================================
# TROSV AI service - FastAPI application package entrypoint.
# Docs/contracts: docs/contracts/AI_CONTRACT.md.
# ============================================================

import os
from fastapi import FastAPI

from app.routers import (
    areas_router,
    chat_router,
    description_router,
    health_router,
    price_advice_router,
    roommates_router,
)

FAKE_MODE = os.getenv("FAKE_MODE", "true").lower() != "false"

app = FastAPI(title="TROSV AI service", version="0.1.0")

app.include_router(health_router)
app.include_router(roommates_router)
app.include_router(price_advice_router)
app.include_router(areas_router)
app.include_router(chat_router)
app.include_router(description_router)
