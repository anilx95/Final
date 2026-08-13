from fastapi import APIRouter, HTTPException

from app.ai.cache.session_store import session_store

router = APIRouter(prefix="/timeline", tags=["Timeline"])


@router.get("/{session_id}")
async def get_timeline(
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

        "timeline": getattr(
            context,
            "timeline",
            [],
        ),

        "summary": getattr(
            context,
            "timeline_summary",
            {},
        ),

    }