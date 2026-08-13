from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.auth.dependencies import get_current_user

from app.services.ocr_service import analyze_board_image
from app.services.audit_service import AuditLogger
from app.services.notification_service import create_system_notification

from app.core.audit_constants import AuditAction

router = APIRouter(
    prefix="/api/ocr",
    tags=["OCR"],
)


@router.post("")
async def perform_ocr(
    image: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if not image.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="Please upload an image.",
        )

    analysis = await analyze_board_image(image)

    AuditLogger.log(
        db=db,
        user_id=current_user.id,
        action=AuditAction.OCR_UPLOAD,
        module="ocr",
        entity_id=None,
        details={
            "filename": image.filename,
            "content_type": image.content_type,
            "text_length": len(analysis.get("text", "")),
        },
    )

    create_system_notification(
        db=db,
        user_id=current_user.id,
        title="Board Analysis & OCR Complete",
        message=f"Board OCR analysis completed successfully for '{image.filename}'. Audio readout ready.",
        notification_type="ocr",
    )

    return {
        "success": True,
        "message": "Board OCR & Multimodal analysis completed successfully.",
        "text": analysis.get("text", ""),
        "summary": analysis.get("summary", ""),
        "key_points": analysis.get("key_points", []),
        "formulas": analysis.get("formulas", []),
        "definitions": analysis.get("definitions", []),
        "audio_readout_script": analysis.get("audio_readout_script", ""),
    }