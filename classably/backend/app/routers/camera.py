from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services.camera_service import camera_service

router = APIRouter(
    prefix="/camera",
    tags=["Camera"],
)


@router.get("/health")
async def health():
    return {
        "status": "online",
        "service": "camera",
    }


@router.post("/frame")
async def upload_frame(
    classroom_id: int = Form(...),
    frame: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    Upload a classroom frame for AI processing.
    """

    return await camera_service.process_frame(
        image=frame,
        classroom_id=classroom_id,
        db=db,
    )