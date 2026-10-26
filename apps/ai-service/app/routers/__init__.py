from app.routers.areas import router as areas_router
from app.routers.chat import router as chat_router
from app.routers.description import router as description_router
from app.routers.health import router as health_router
from app.routers.price_advice import router as price_advice_router
from app.routers.roommates import router as roommates_router

__all__ = [
    "areas_router",
    "chat_router",
    "description_router",
    "health_router",
    "price_advice_router",
    "roommates_router",
]
