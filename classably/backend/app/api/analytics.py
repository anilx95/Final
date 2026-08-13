from fastapi import APIRouter, HTTPException

from app.ai.cache.session_store import session_store

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/{session_id}")
async def get_analytics(
    session_id: str,
):

    context = session_store.get(session_id)

    if context is None:

        raise HTTPException(
            status_code=404,
            detail="Session not found",
        )

    return {

        "session_id": session_id,

        "processing_time": context.processing_time,

        "analytics": getattr(
            context,
            "analytics",
            {},
        ),

        "engagement_score": getattr(
            context,
            "engagement_score",
            None,
        ),

    }