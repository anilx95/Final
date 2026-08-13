from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.orm import Session

from app.ai.orchestrator.context import PipelineContext
from app.ai.orchestrator.pipeline import pipeline
from app.core.database import get_db
from app.services.persistence_service import persistence_service

router = APIRouter()


@router.post("/frame")
async def process_frame(
    image: UploadFile = File(...),
    db: Session = Depends(get_db),
):

    # Read uploaded image
    image_bytes = await image.read()

    # Create pipeline context
    context = PipelineContext(
        image=image_bytes,
    )

    # Run AI Pipeline
    context = pipeline.run(context)

    # Persist results
    persistence_service.save_pipeline_result(
        db=db,
        context=context,
    )

    # Return API response
    return {

        "processing_time": context.processing_time,

        "objects_detected": len(
            getattr(context, "detections", [])
        ),

        "alerts": getattr(
            context,
            "alerts",
            [],
        ),

        "navigation_message": (
            context.navigation.tts_message
            if getattr(context, "navigation", None)
            else None
        ),

        "voice_messages": [

            message.message

            for message in getattr(
                context,
                "voice_messages",
                [],
            )

        ],

        "analytics": getattr(
            context,
            "analytics",
            {},
        ),

        "timeline": getattr(
            context,
            "timeline",
            [],
        ),

    }