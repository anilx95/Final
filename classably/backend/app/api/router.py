from fastapi import APIRouter

from app.api.analytics import router as analytics_router
from app.api.camera import router as camera_router
from app.api.navigation import router as navigation_router
from app.api.timeline import router as timeline_router
from app.api.websocket import router as websocket_router

api_router = APIRouter()

api_router.include_router(
    camera_router,
    prefix="/camera",
    tags=["Camera"],
)

api_router.include_router(
    analytics_router,
)

api_router.include_router(
    timeline_router,
)

api_router.include_router(
    navigation_router,
)

api_router.include_router(
    websocket_router,
)