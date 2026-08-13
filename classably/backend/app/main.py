import os
os.environ["PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION"] = "python"

from contextlib import asynccontextmanager
import logging

logger = logging.getLogger(__name__)

from fastapi import FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware

from starlette.exceptions import HTTPException as StarletteHTTPException
from sqlalchemy.exc import SQLAlchemyError

from app.core.database import Base, engine
from app.core.exceptions import (
    http_exception_handler,
    validation_exception_handler,
    sqlalchemy_exception_handler,
    generic_exception_handler,
    not_found_handler,
)

# Import all models so SQLAlchemy registers them
import app.models.models

# Routers
from app.routers.auth import router as auth_router
from app.routers.admin import router as admin_router
from app.routers.academics import router as academics_router
from app.routers.export_router import router as export_router
from app.routers.students import router as student_router
from app.routers.teachers import router as teacher_router
from app.routers.classrooms import router as classroom_router
from app.routers.attendance import router as attendance_router
from app.routers.camera import router as camera_router
from app.routers.assist import router as assist_router
from app.routers.ocr import router as ocr_router
from app.routers.devices import router as devices_router
from app.routers.voice import router as voice_router
from app.routers.navigation import router as navigation_router
from app.routers.profiles import router as profiles_router
from app.routers.sync import router as sync_router
from app.routers.ws import router as ws_router
from app.routers.lecture_notes import router as lecture_note_router
from app.routers.accessibility import router as accessibility_router
from app.routers.dashboard import router as dashboard_router
from app.routers.audit import router as audit_router
from app.routers.notifications import router as notification_router
from app.routers.events import router as events_router
from app.routers.analytics_dashboard import router as analytics_dashboard_router

# WebSocket Routers
from app.websocket.camera_ws import router as camera_ws_router
from app.websocket.event_ws import router as event_ws_router

# Additional Routers
from app.routers import lecture_session_router
from app.routers import teacher_dashboard

from app.api.ai.router import router as ai_router
from app.routers.ai_qa_router import router as ai_qa_router


from app.core.database import Base, engine, sync_db_schema

@asynccontextmanager
async def lifespan(app: FastAPI):
    sync_db_schema()

    manager = None
    try:
        from app.ai.async_pipeline.manager import AsyncManager

        manager = AsyncManager()
        manager.start()
    except Exception as exc:
        logger.warning("AsyncManager unavailable during startup: %s", exc)

    try:
        yield
    finally:
        if manager:
            manager.stop()


app = FastAPI(
    title="ClassAbly API",
    version="1.0.0",
    lifespan=lifespan,
)

# Exception Handlers
app.add_exception_handler(StarletteHTTPException, not_found_handler)
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(SQLAlchemyError, sqlalchemy_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

# CORS
from app.core.config import settings

origins = [origin.strip() for origin in settings.ALLOWED_ORIGINS.split(",") if origin.strip()]
if not origins or "*" in origins:
    origins = ["*"]
    allow_credentials = False
else:
    allow_credentials = True

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth_router, prefix="/api")
app.include_router(admin_router)
app.include_router(academics_router)
app.include_router(export_router)

app.include_router(camera_router)
app.include_router(student_router)
app.include_router(teacher_router)
app.include_router(classroom_router)
app.include_router(attendance_router)
app.include_router(assist_router)
app.include_router(ocr_router)
app.include_router(devices_router)
app.include_router(voice_router)
app.include_router(navigation_router)
app.include_router(profiles_router)
app.include_router(sync_router)
app.include_router(ws_router)
app.include_router(lecture_note_router)
app.include_router(accessibility_router)
app.include_router(dashboard_router)
app.include_router(audit_router)
app.include_router(notification_router)
app.include_router(analytics_dashboard_router)

app.include_router(ai_router)
app.include_router(ai_qa_router)

# WebSocket Routers
app.include_router(camera_ws_router)
app.include_router(event_ws_router)

# Additional Modules
app.include_router(lecture_session_router.router)
app.include_router(teacher_dashboard.router)
app.include_router(events_router)


@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "message": "ClassAbly Platform API Operational",
        "version": "1.0.0",
    }

# Serve static frontend SPA if built dist folder exists
frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "web", "dist"))
if not os.path.exists(frontend_dist):
    frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "web", "dist"))

if os.path.exists(frontend_dist):
    from fastapi.staticfiles import StaticFiles
    from fastapi.responses import FileResponse

    assets_dir = os.path.join(frontend_dist, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith(("api/", "admin/", "academics/", "camera/", "events/", "ws/", "events")):
            raise HTTPException(status_code=404, detail="API endpoint not found")
        
        file_path = os.path.join(frontend_dist, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist, "index.html"))
else:
    @app.get("/")
    def root():
        return {
            "status": "ok",
            "message": "ClassAbly Platform API Operational",
            "version": "1.0.0",
        }