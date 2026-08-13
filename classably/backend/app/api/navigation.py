from fastapi import APIRouter, HTTPException

from app.ai.cache.session_store import session_store

router = APIRouter(prefix="/navigation", tags=["Navigation"])


@router.get("/{session_id}")
async def get_navigation(
    session_id: str,
):

    context = session_store.get(session_id)

    if context is None:

        raise HTTPException(
            status_code=404,
            detail="Session not found",
        )

    navigation = getattr(
        context,
        "navigation",
        None,
    )

    if navigation is None:

        return {
            "session_id": session_id,
            "navigation": None,
        }

    return {

        "session_id": session_id,

        "safe_direction": navigation.safe_direction,

        "recommended_action": navigation.recommended_action,

        "warning_level": navigation.warning_level,

        "tts_message": navigation.tts_message,

        "confidence": navigation.confidence,

    }