"""
AI Q&A and Summarization API Router.

Endpoints for:
- Student asking AI questions during live lectures
- Generating AI-powered lecture summaries
- Retrieving Q&A history and summaries
"""

import logging
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.auth.dependencies import get_current_user
from app.models.entities.user import User
from app.models.entities.lecture import LectureSession, LiveSubtitle
from app.models.entities.ai_qa import AIQAMessage, AILectureSummary
from app.services.ai_qa_service import ai_qa_service

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/ai-qa",
    tags=["AI Q&A"],
)


@router.post("/ask")
def ask_ai_question(
    payload: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Student asks an AI question during a live lecture.
    The AI uses the lecture transcript as context to provide relevant answers.
    """
    session_id = payload.get("session_id")
    question = payload.get("question", "").strip()

    if not question:
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    if not session_id:
        raise HTTPException(status_code=400, detail="session_id is required to ask a class-specific question.")

    # Get lecture session for context
    session = db.get(LectureSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail=f"Lecture session {session_id} not found.")

    subject = session.subject or "General"
    topic = getattr(session, "topic", "Lecture") or "Lecture"

    # Get recent transcript as context
    subtitles = (
        db.query(LiveSubtitle)
        .filter(LiveSubtitle.session_id == session_id)
        .order_by(LiveSubtitle.created_at.desc())
        .limit(30)
        .all()
    )
    transcript_context = " ".join(
        [s.original_text for s in reversed(subtitles)]
    ) if subtitles else "No transcript available yet."

    # Get AI answer
    answer = ai_qa_service.ask_question(
        question=question,
        transcript_context=transcript_context,
        subject=subject,
        topic=topic,
    )

    # Determine student_id from user profile
    student_id = None
    if current_user.role == "student" and hasattr(current_user, "student") and current_user.student:
        student_id = current_user.student.id
    else:
        student_id = payload.get("student_id", 1)

    # Save to database
    qa_message = AIQAMessage(
        session_id=session_id,
        student_id=student_id,
        question=question,
        answer=answer,
        context_used=transcript_context[:500],
    )
    db.add(qa_message)
    db.commit()
    db.refresh(qa_message)

    return {
        "success": True,
        "message": {
            "id": qa_message.id,
            "question": qa_message.question,
            "answer": qa_message.answer,
            "created_at": qa_message.created_at.strftime("%H:%M:%S") if qa_message.created_at else None,
        },
    }


@router.get("/history/{session_id}")
def get_qa_history(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all AI Q&A messages for a lecture session."""
    messages = (
        db.query(AIQAMessage)
        .filter(AIQAMessage.session_id == session_id)
        .order_by(AIQAMessage.created_at.asc())
        .all()
    )

    return [
        {
            "id": m.id,
            "student_id": m.student_id,
            "student_name": m.student.name if m.student else "Student",
            "question": m.question,
            "answer": m.answer,
            "created_at": m.created_at.strftime("%H:%M:%S") if m.created_at else None,
        }
        for m in messages
    ]


@router.delete("/history/{session_id}")
@router.post("/clear-history/{session_id}")
def clear_qa_history(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Clear active AI assistant conversation history for this session."""
    query = db.query(AIQAMessage).filter(AIQAMessage.session_id == session_id)
    if current_user.role == "student" and hasattr(current_user, "student") and current_user.student:
        query = query.filter(AIQAMessage.student_id == current_user.student.id)
    
    deleted_count = query.delete(synchronize_session=False)
    db.commit()
    return {"success": True, "message": f"Cleared {deleted_count} messages from active session history."}


@router.post("/summarize/{session_id}")
def summarize_lecture(
    session_id: int,
    payload: dict = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Generate an AI-powered summary of a lecture session.
    Supports multiple styles: concise, detailed, study_notes, bullet_points.
    """
    if payload is None:
        payload = {}

    style = payload.get("style", "detailed")

    session = db.get(LectureSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Lecture session not found.")

    # Get full transcript
    subtitles = (
        db.query(LiveSubtitle)
        .filter(LiveSubtitle.session_id == session_id)
        .order_by(LiveSubtitle.created_at.asc())
        .all()
    )
    transcript = " ".join([s.original_text for s in subtitles]) if subtitles else ""

    if not transcript:
        raise HTTPException(
            status_code=400,
            detail="No transcript available for this session. Summary cannot be generated.",
        )

    # Calculate duration
    duration_minutes = 0
    if session.started_at and session.ended_at:
        delta = session.ended_at - session.started_at
        duration_minutes = int(delta.total_seconds() / 60)

    # Generate summary
    result = ai_qa_service.summarize_lecture(
        transcript=transcript,
        subject=session.subject or "General Lecture",
        topic=getattr(session, "topic", "Lecture") or "Lecture",
        duration_minutes=duration_minutes,
        style=style,
    )

    # Save or update in database
    existing = (
        db.query(AILectureSummary)
        .filter(AILectureSummary.session_id == session_id)
        .first()
    )

    if existing:
        existing.summary_text = result["summary_text"]
        existing.key_points = result["key_points"]
        existing.definitions = result["definitions"]
        existing.formulas = result["formulas"]
        existing.style = style
        existing.created_at = datetime.utcnow()
    else:
        existing = AILectureSummary(
            session_id=session_id,
            summary_text=result["summary_text"],
            key_points=result["key_points"],
            definitions=result["definitions"],
            formulas=result["formulas"],
            style=style,
        )
        db.add(existing)

    db.commit()
    db.refresh(existing)

    return {
        "success": True,
        "summary": {
            "id": existing.id,
            "session_id": existing.session_id,
            "summary_text": existing.summary_text,
            "key_points": existing.key_points,
            "definitions": existing.definitions,
            "formulas": existing.formulas,
            "style": existing.style,
            "created_at": existing.created_at.strftime("%Y-%m-%d %H:%M:%S") if existing.created_at else None,
        },
    }


@router.get("/summary/{session_id}")
def get_summary(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get the AI-generated summary for a lecture session."""
    summary = (
        db.query(AILectureSummary)
        .filter(AILectureSummary.session_id == session_id)
        .first()
    )

    if not summary:
        raise HTTPException(
            status_code=404,
            detail="No summary found for this session. Generate one first.",
        )

    return {
        "id": summary.id,
        "session_id": summary.session_id,
        "summary_text": summary.summary_text,
        "key_points": summary.key_points,
        "definitions": summary.definitions,
        "formulas": summary.formulas,
        "style": summary.style,
        "created_at": summary.created_at.strftime("%Y-%m-%d %H:%M:%S") if summary.created_at else None,
    }


@router.post("/visualize")
def generate_visual_diagram(
    payload: dict,
):
    """
    Explain → Visualize Engine: Generates structured interactive diagrams
    (SVG/Canvas nodes, relationships, and spatial audio description) for the active lesson topic & speech.
    """
    from app.services.visual_engine_service import visual_engine_service
    topic = payload.get("topic", "").strip() or payload.get("text", "").strip() or "General Science"
    transcript = payload.get("transcript", "").strip() or payload.get("live_transcript", "").strip() or ""
    subject = payload.get("subject", "Science")
    target_lang = payload.get("target_lang", "en")

    diagram = visual_engine_service.find_or_generate_diagram(topic, transcript, subject, target_lang)
    return {"success": True, "diagram": diagram}

