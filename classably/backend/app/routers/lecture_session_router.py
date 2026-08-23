import os
import logging
from typing import Optional, List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File, BackgroundTasks
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.auth.dependencies import get_current_user, require_teacher
from app.models.entities.user import User
from app.models.entities.lecture import (
    LectureSession, LiveSubtitle, BoardSnapshot, LectureNote, LectureChapter,
    GeneratedQuestion, LectureRecording
)
from app.models.entities.smart_classroom import RaiseHandEvent, QAItem
from app.models.entities.student import Student
from app.models.entities.connected_student import ConnectedStudent
from app.services.lecture_session_service import lecture_session_service
from app.services.translation_service import translation_service
from app.services.ai_qa_service import ai_qa_service

import asyncio
from app.services.ws_manager import ws_manager

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/lecture-session",
    tags=["Lecture Session Studio"],
)


@router.post("/start")
def start_session(
    classroom_id: int,
    subject: str,
    topic: Optional[str] = "General Lecture",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Start a new lecture session. Uses authenticated teacher's identity."""
    from app.models.entities.classroom import Classroom
    from app.models.entities.teacher import Teacher

    # Resolve teacher from authenticated user
    teacher = None
    if current_user.role == "teacher" and hasattr(current_user, "teacher") and current_user.teacher:
        teacher = current_user.teacher
    else:
        # Fallback: find or create teacher record
        teacher = db.query(Teacher).filter(Teacher.user_id == current_user.id).first()
        if not teacher:
            teacher = Teacher(
                user_id=current_user.id,
                name=current_user.full_name,
                email=current_user.email,
                employee_id=f"EMP-{current_user.id}",
            )
            db.add(teacher)
            db.flush()

    classroom = db.get(Classroom, classroom_id)
    if not classroom:
        classroom = Classroom(
            id=classroom_id,
            name=f"Smart Classroom {classroom_id}",
            building="Main Block",
            floor=1,
        )
        db.add(classroom)
        db.flush()

    session = lecture_session_service.start_session(
        db=db,
        classroom_id=classroom.id,
        teacher_id=teacher.id,
        subject=subject,
    )
    session.topic = topic
    db.commit()
    db.refresh(session)

    return {
        "success": True,
        "message": "Lecture session started successfully.",
        "session": {
            "id": session.id,
            "classroom_id": session.classroom_id,
            "teacher_id": session.teacher_id,
            "teacher_name": teacher.name,
            "subject": session.subject,
            "topic": session.topic,
            "status": session.status,
            "started_at": session.started_at,
        },
    }


@router.get("/active-sessions")
def get_all_active_sessions(db: Session = Depends(get_db)):
    active_sessions = (
        db.query(LectureSession)
        .filter(func.upper(LectureSession.status) == "ACTIVE")
        .order_by(LectureSession.started_at.desc())
        .all()
    )
    results = []
    for s in active_sessions:
        teacher_name = s.teacher.name if s.teacher else (s.teacher_name or "Faculty Educator")
        from app.models.entities.classroom import Classroom
        classroom = db.query(Classroom).filter(Classroom.id == s.classroom_id).first()
        room_name = classroom.name if classroom else f"Room #{s.classroom_id}"
        results.append({
            "id": s.id,
            "session_id": s.id,
            "classroom_id": s.classroom_id,
            "room_name": room_name,
            "teacher_id": s.teacher_id,
            "teacher_name": teacher_name,
            "subject": s.subject,
            "topic": getattr(s, "topic", "Live Lecture"),
            "status": s.status or "ACTIVE",
            "started_at": s.started_at,
        })
    return {"success": True, "active_sessions": results}

@router.get("/teachers")
def list_faculty_teachers_for_students(db: Session = Depends(get_db)):
    teachers = db.query(User).filter(User.role == "teacher").all()
    results = []
    for t in teachers:
        active_sess = db.query(LectureSession).filter(
            LectureSession.teacher_id == t.id,
            func.upper(LectureSession.status) == "ACTIVE"
        ).order_by(LectureSession.started_at.desc()).first()

        results.append({
            "id": t.id,
            "full_name": t.full_name,
            "email": t.email,
            "is_active": True if t.is_active is not False else False,
            "is_live": active_sess is not None,
            "session_id": active_sess.id if active_sess else None,
            "classroom_id": active_sess.classroom_id if active_sess else None,
            "subject": active_sess.subject if active_sess else None,
            "topic": getattr(active_sess, "topic", None) if active_sess else None,
        })
    return results


@router.get("/active/{classroom_id}")
def get_active_session(
    classroom_id: int,
    db: Session = Depends(get_db),
):
    session = lecture_session_service.get_active_session(
        db=db,
        classroom_id=classroom_id,
    )

    if session is not None:
        teacher_name = session.teacher.name if session.teacher else "Teacher"
        return {
            "success": True,
            "is_active": True,
            "session": {
                "id": session.id,
                "classroom_id": session.classroom_id,
                "teacher_id": session.teacher_id,
                "teacher_name": teacher_name,
                "subject": session.subject,
                "topic": getattr(session, "topic", "Lecture"),
                "status": session.status or "ACTIVE",
                "started_at": session.started_at,
            },
        }

    # If no ACTIVE session, look up recent ended session for downloads/recordings context
    last_session = (
        db.query(LectureSession)
        .filter(LectureSession.classroom_id == classroom_id)
        .order_by(LectureSession.started_at.desc())
        .first()
    )

    if last_session:
        teacher_name = last_session.teacher.name if last_session.teacher else "Teacher"
        return {
            "success": True,
            "is_active": False,
            "session": {
                "id": last_session.id,
                "classroom_id": last_session.classroom_id,
                "teacher_id": last_session.teacher_id,
                "teacher_name": teacher_name,
                "subject": last_session.subject,
                "topic": getattr(last_session, "topic", "Lecture"),
                "status": last_session.status or "ENDED",
                "started_at": last_session.started_at,
                "ended_at": last_session.ended_at,
            },
        }

    return {
        "success": True,
        "is_active": False,
        "session": None,
    }


@router.get("/history")
def get_session_history(
    classroom_id: Optional[int] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    query = db.query(LectureSession)
    if classroom_id:
        query = query.filter(LectureSession.classroom_id == classroom_id)

    sessions = query.order_by(LectureSession.started_at.desc()).limit(limit).all()
    result = []
    for s in sessions:
        rec = db.query(LectureRecording).filter(LectureRecording.session_id == s.id).first()
        duration_sec = getattr(rec, "duration_seconds", 0) or 0
        if not duration_sec and getattr(s, "ended_at", None) and getattr(s, "started_at", None):
            try:
                duration_sec = (s.ended_at - s.started_at).total_seconds()
            except Exception:
                duration_sec = 0
        duration_min = f"{int(duration_sec // 60)} mins" if duration_sec > 0 else "Full Session"

        t_name = getattr(s, "teacher_name", None)
        if not t_name and getattr(s, "teacher", None):
            t_name = getattr(s.teacher, "name", None) or getattr(s.teacher, "full_name", "Teacher")
        if not t_name:
            t_name = "Teacher"

        result.append({
            "id": s.id,
            "classroom_id": s.classroom_id,
            "teacher_id": getattr(s, "teacher_id", None),
            "teacher_name": t_name,
            "subject": getattr(s, "subject", "Lecture") or "Lecture",
            "topic": getattr(s, "topic", "Lecture") or "Lecture",
            "status": getattr(s, "status", "ENDED") or "ENDED",
            "started_at": s.started_at.strftime("%Y-%m-%d %H:%M:%S") if getattr(s, "started_at", None) else None,
            "date": s.started_at.strftime("%Y-%m-%d") if getattr(s, "started_at", None) else datetime.utcnow().strftime("%Y-%m-%d"),
            "duration": duration_min,
            "has_recording": bool(rec and (getattr(rec, "video_path", None) or getattr(rec, "audio_path", None))),
        })
    return result


def _process_background_ai_summary(session_id: int):
    try:
        from app.core.database import SessionLocal
        db = SessionLocal()
        try:
            session = db.query(LectureSession).filter(LectureSession.id == session_id).first()
            if not session:
                return
            subtitles = db.query(LiveSubtitle).filter(LiveSubtitle.session_id == session_id).all()
            full_transcript = " ".join([s.original_text for s in subtitles if s.original_text]) if subtitles else ""

            summary_data = ai_qa_service.summarize_lecture(
                transcript=full_transcript or "No transcript recorded.",
                subject=session.subject or "General Lecture",
                topic=getattr(session, "topic", "Lecture") or "Lecture",
                duration_minutes=int((session.ended_at - session.started_at).total_seconds() / 60) if session.ended_at and session.started_at else 0,
                style="detailed",
            )

            note = db.query(LectureNote).filter(LectureNote.session_id == session_id).first()
            if not note:
                note = LectureNote(
                    session_id=session_id,
                    classroom_id=session.classroom_id,
                    title=f"{session.subject} — {getattr(session, 'topic', 'Lecture') or 'Lecture'}",
                    raw_transcript=full_transcript,
                    summary=summary_data["summary_text"],
                    key_points=summary_data["key_points"],
                    formulas=summary_data["formulas"],
                    definitions=summary_data["definitions"],
                )
                db.add(note)
            else:
                note.raw_transcript = full_transcript
                note.summary = summary_data["summary_text"]
                note.key_points = summary_data["key_points"]
                note.formulas = summary_data["formulas"]
                note.definitions = summary_data["definitions"]
            db.commit()
        finally:
            db.close()
    except Exception as e:
        logger.warning(f"Background AI summary task exception: {e}")


@router.post("/end/{session_id}")
def end_session(
    session_id: int,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = lecture_session_service.end_session(
        db=db,
        session_id=session_id,
    )

    if session is None:
        raise HTTPException(
            status_code=404,
            detail="Lecture session not found.",
        )

    # Mark all connected students as disconnected immediately
    db.query(ConnectedStudent).filter(
        ConnectedStudent.session_id == session_id,
        ConnectedStudent.is_active == True,
    ).update({"is_active": False, "left_at": datetime.utcnow()})
    db.commit()

    # Synchronously save initial LectureNote and raw_transcript from LiveSubtitles so export artifacts are immediately available
    try:
        subtitles = db.query(LiveSubtitle).filter(LiveSubtitle.session_id == session_id).order_by(LiveSubtitle.created_at.asc()).all()
        full_transcript = "\n".join([f"[{s.created_at.strftime('%H:%M:%S')}] {s.speaker_name}: {s.original_text}" for s in subtitles if s.original_text]) if subtitles else ""
        
        note = db.query(LectureNote).filter(LectureNote.session_id == session_id).first()
        if not note:
            note = LectureNote(
                session_id=session_id,
                classroom_id=session.classroom_id,
                title=f"{session.subject} — {getattr(session, 'topic', 'Lecture') or 'Lecture'}",
                raw_transcript=full_transcript,
                summary=f"Lecture summary for {session.subject} ({getattr(session, 'topic', 'Lecture') or 'Lecture'}). Session concluded.",
                key_points=[s.original_text for s in subtitles[:5]] if subtitles else ["Lecture completed successfully."],
                formulas=[],
                definitions=[],
            )
            db.add(note)
        else:
            note.raw_transcript = full_transcript
        db.commit()
    except Exception as note_err:
        logger.warning(f"Immediate lecture note save warning: {note_err}")

    # Broadcast lecture_ended event over WebSockets immediately to all rooms
    try:
        import asyncio
        end_event = {
            "type": "lecture_ended",
            "session_id": session_id,
            "classroom_id": session.classroom_id,
            "status": "ENDED",
            "message": "The live lecture session has ended.",
        }
        asyncio.create_task(ws_manager.broadcast_event(session.classroom_id, end_event))
        asyncio.create_task(ws_manager.broadcast_event(str(session.classroom_id), end_event))
        asyncio.create_task(ws_manager.broadcast_event(session_id, end_event))
        asyncio.create_task(ws_manager.broadcast_event(str(session_id), end_event))
    except Exception as ws_err:
        logger.warning(f"Failed to broadcast lecture_ended event: {ws_err}")

    # Generate LectureRecording record if not exists
    recording = db.query(LectureRecording).filter(LectureRecording.session_id == session_id).first()
    if not recording:
        recording = LectureRecording(
            session_id=session_id,
            duration_seconds=0.0,
            file_size_bytes=0,
        )
        db.add(recording)
        db.commit()

    # Process AI summary in background thread non-blocking
    background_tasks.add_task(_process_background_ai_summary, session_id)

    return {
        "success": True,
        "message": "Lecture session ended instantly.",
        "session": {
            "id": session.id,
            "classroom_id": session.classroom_id,
            "status": session.status,
            "ended_at": session.ended_at,
        },
    }


# ==========================================
# Subtitles & Real-Time Transcription
# ==========================================

@router.post("/subtitles/ingest")
async def ingest_subtitle(
    payload: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session_id = payload["session_id"]
    original_text = payload.get("text", "").strip()
    speaker_name = payload.get("speaker_name") or current_user.full_name or "Teacher"
    target_lang = payload.get("target_lang", "en")
    is_interim = payload.get("is_interim", False)

    if not original_text:
        raise HTTPException(status_code=400, detail="Text cannot be empty.")

    # Precompute common translations so students receive Hindi & Telugu instantly without lagging
    all_translations = translation_service.get_all_translations(original_text)
    translated = all_translations.get(target_lang, original_text)

    subtitle_id = int(payload.get("id") or (datetime.utcnow().timestamp() * 1000))

    if not is_interim:
        subtitle = LiveSubtitle(
            session_id=session_id,
            speaker_name=speaker_name,
            original_text=original_text,
            translated_text=translated,
            language=target_lang,
            timestamp_offset=payload.get("timestamp_offset", 0.0),
        )
        db.add(subtitle)
        db.commit()
        db.refresh(subtitle)
        subtitle_id = subtitle.id

    # Broadcast subtitle IMMEDIATELY to live classroom subscribers via WebSocket
    try:
        session = db.get(LectureSession, session_id)
        classroom_id = session.classroom_id if session else 1

        event_payload = {
            "type": "subtitle",
            "is_interim": is_interim,
            "classroom_id": classroom_id,
            "session_id": session_id,
            "subtitle": {
                "id": subtitle_id,
                "speaker": speaker_name,
                "text": original_text,
                "original_text": original_text,
                "translated_text": translated,
                "translations": all_translations,
                "timestamp": datetime.utcnow().strftime("%H:%M:%S"),
            },
        }

        # Broadcast to classroom rooms and session rooms instantly
        await ws_manager.broadcast_event(classroom_id, event_payload)
        await ws_manager.broadcast_event(str(classroom_id), event_payload)
        await ws_manager.broadcast_event(session_id, event_payload)
        await ws_manager.broadcast_event(str(session_id), event_payload)
    except Exception as e:
        logger.warning(f"WebSocket subtitle broadcast warning: {e}")

    return {
        "status": "ingested",
        "id": subtitle_id,
        "translated": translated,
        "translations": all_translations,
        "is_interim": is_interim,
    }


@router.get("/subtitles/{session_id}")
def get_session_subtitles(session_id: int, target_lang: Optional[str] = "en", db: Session = Depends(get_db)):
    subtitles = db.query(LiveSubtitle).filter(LiveSubtitle.session_id == session_id).order_by(LiveSubtitle.created_at.asc()).all()
    result = []
    for s in subtitles:
        displayText = s.original_text
        if target_lang and target_lang != "en":
            displayText = s.translated_text if s.translated_text and s.language == target_lang else translation_service.translate(s.original_text, target_lang)

        result.append({
            "id": s.id,
            "speaker": s.speaker_name,
            "text": displayText,
            "original_text": s.original_text,
            "translated_text": displayText,
            "language": target_lang or "en",
            "timestamp": s.created_at.strftime("%H:%M:%S"),
        })
    return result


@router.post("/translate")
async def translate_text(payload: dict):
    text = payload.get("text", "").strip()
    target_lang = payload.get("target_lang", "en")
    if not text:
        return {"translated_text": "", "target_lang": target_lang}
    translated = await translation_service.translate_async(text, target_lang)
    return {"translated_text": translated, "target_lang": target_lang}


@router.post("/upload-recording/{session_id}")
async def upload_recording(
    session_id: int,
    video: Optional[UploadFile] = File(None),
    audio: Optional[UploadFile] = File(None),
    duration: Optional[float] = Query(0.0),
    db: Session = Depends(get_db),
):
    upload_dir = os.path.join("uploads", "recordings")
    os.makedirs(upload_dir, exist_ok=True)

    video_path = None
    audio_path = None
    file_size = 0

    if video and video.filename:
        video_filename = f"lecture_{session_id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.webm"
        file_dest = os.path.join(upload_dir, video_filename)
        content = await video.read()
        with open(file_dest, "wb") as f:
            f.write(content)
        video_path = file_dest
        file_size += len(content)

    if audio and audio.filename:
        audio_filename = f"lecture_{session_id}_audio_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.webm"
        file_dest = os.path.join(upload_dir, audio_filename)
        content = await audio.read()
        with open(file_dest, "wb") as f:
            f.write(content)
        audio_path = file_dest
        if not video_path:
            file_size += len(content)

    recording = db.query(LectureRecording).filter(LectureRecording.session_id == session_id).first()
    if not recording:
        recording = LectureRecording(session_id=session_id)
        db.add(recording)

    if video_path:
        recording.video_path = video_path
    if audio_path:
        recording.audio_path = audio_path
    if duration and duration > 0:
        recording.duration_seconds = duration
    if file_size > 0:
        recording.file_size_bytes = file_size

    db.commit()
    db.refresh(recording)

    return {
        "success": True,
        "message": "Recording uploaded successfully.",
        "recording_id": recording.id,
        "video_path": recording.video_path,
        "audio_path": recording.audio_path,
    }


# ==========================================
# Raise Hand & Live Q&A Studio
# ==========================================

@router.post("/raise-hand")
def trigger_raise_hand(payload: dict, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    student_id = current_user.student.id if (current_user.student) else payload.get("student_id", 1)
    session_id = payload["session_id"]
    question_text = payload.get("question_text", "Student raised hand for assistance")

    event = RaiseHandEvent(
        session_id=session_id,
        student_id=student_id,
        question_text=question_text,
        status="pending",
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return {"message": "Hand raised successfully", "event_id": event.id}


@router.get("/raise-hand/{session_id}")
def get_raise_hand_queue(session_id: int, db: Session = Depends(get_db)):
    events = db.query(RaiseHandEvent).filter(RaiseHandEvent.session_id == session_id, RaiseHandEvent.status == "pending").all()
    return [
        {
            "id": e.id,
            "student_id": e.student_id,
            "student_name": e.student.name if e.student else "Student",
            "question_text": e.question_text,
            "created_at": e.created_at.strftime("%H:%M:%S"),
        }
        for e in events
    ]


@router.post("/raise-hand/{event_id}/resolve")
def resolve_raise_hand(event_id: int, db: Session = Depends(get_db)):
    event = db.query(RaiseHandEvent).filter(RaiseHandEvent.id == event_id).first()
    if event:
        event.status = "resolved"
        event.resolved_at = datetime.utcnow()
        db.commit()
    return {"message": "Raise hand resolved"}


# ==========================================
# Connected Students & Session Management
# ==========================================

@router.post("/connect")
def student_connect(
    payload: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Track student connecting to a live lecture session."""
    session_id = payload.get("session_id")
    peer_id = payload.get("peer_id", "")

    if not session_id:
        raise HTTPException(status_code=400, detail="Session ID is required.")

    student_id = None
    if current_user.role == "student" and hasattr(current_user, "student") and current_user.student:
        student_id = current_user.student.id
    else:
        student_id = payload.get("student_id", 1)

    # Check if student was previously kicked from this session
    kicked_record = db.query(ConnectedStudent).filter(
        ConnectedStudent.session_id == session_id,
        ConnectedStudent.student_id == student_id,
        ConnectedStudent.is_kicked == True,
    ).first()

    if kicked_record:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You have been removed from this live lecture session by the teacher and cannot rejoin.",
        )

    # Check if already connected
    existing = db.query(ConnectedStudent).filter(
        ConnectedStudent.session_id == session_id,
        ConnectedStudent.student_id == student_id,
        ConnectedStudent.is_active == True,
    ).first()

    if existing:
        existing.peer_id = peer_id
        db.commit()
        return {"message": "Connection updated", "connection_id": existing.id}

    conn = ConnectedStudent(
        session_id=session_id,
        student_id=student_id,
        peer_id=peer_id,
        is_active=True,
    )
    db.add(conn)
    db.commit()
    db.refresh(conn)
    return {"message": "Connected to session", "connection_id": conn.id}


@router.post("/disconnect")
def student_disconnect(
    payload: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Track student disconnecting from a live lecture session."""
    session_id = payload.get("session_id")

    student_id = None
    if current_user.role == "student" and hasattr(current_user, "student") and current_user.student:
        student_id = current_user.student.id
    else:
        student_id = payload.get("student_id", 1)

    conn = db.query(ConnectedStudent).filter(
        ConnectedStudent.session_id == session_id,
        ConnectedStudent.student_id == student_id,
        ConnectedStudent.is_active == True,
    ).first()

    if conn:
        conn.is_active = False
        conn.left_at = datetime.utcnow()
        db.commit()

    return {"message": "Disconnected from session"}


@router.get("/connected/{session_id}")
def get_connected_students(
    session_id: int,
    db: Session = Depends(get_db),
):
    """Get list of students currently connected to a live lecture."""
    connections = db.query(ConnectedStudent).filter(
        ConnectedStudent.session_id == session_id,
        ConnectedStudent.is_active == True,
        ConnectedStudent.is_kicked == False,
    ).all()

    return [
        {
            "id": c.id,
            "student_id": c.student_id,
            "student_name": c.student.name if c.student else "Student",
            "peer_id": c.peer_id,
            "joined_at": c.joined_at.strftime("%H:%M:%S") if c.joined_at else None,
        }
        for c in connections
    ]


@router.post("/kick/{session_id}/{student_id}")
async def kick_student(
    session_id: int,
    student_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Teacher kicks a student from the live lecture session with real-time enforcement."""
    conn = db.query(ConnectedStudent).filter(
        ConnectedStudent.session_id == session_id,
        ConnectedStudent.student_id == student_id,
        ConnectedStudent.is_active == True,
    ).first()

    # Even if inactive connection record exists, ensure all records for this student in session are marked kicked
    if not conn:
        conn = db.query(ConnectedStudent).filter(
            ConnectedStudent.session_id == session_id,
            ConnectedStudent.student_id == student_id,
        ).first()

    if not conn:
        raise HTTPException(status_code=404, detail="Student not found in session.")

    conn.is_active = False
    conn.is_kicked = True
    conn.kicked_at = datetime.utcnow()
    db.commit()

    session = db.get(LectureSession, session_id)
    classroom_id = session.classroom_id if session else 1

    student = db.get(Student, student_id)
    student_name = student.name if student else "Student"

    # Broadcast kick message via WebSocket to both classroom and session channels
    kick_event = {
        "type": "student_kicked",
        "student_id": student_id,
        "peer_id": conn.peer_id,
        "session_id": session_id,
        "classroom_id": classroom_id,
        "message": f"{student_name} has been removed from this live lecture session by the teacher.",
    }

    try:
        await ws_manager.broadcast_event(classroom_id, kick_event)
        await ws_manager.broadcast_event(str(classroom_id), kick_event)
        await ws_manager.broadcast_event(session_id, kick_event)
        await ws_manager.broadcast_event(str(session_id), kick_event)
    except Exception as e:
        logger.warning(f"WebSocket kick broadcast error: {e}")

    return {"message": f"{student_name} has been kicked from the session."}


@router.post("/mark-attendance/{session_id}")
def mark_attendance_from_session(
    session_id: int,
    payload: dict = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Bulk mark attendance for all connected students in a session.
    Optionally accepts a dict of student_id -> status overrides.
    """
    from app.models.entities.attendance import Attendance

    if payload is None:
        payload = {}

    overrides = payload.get("overrides", {})

    # Get all students who connected to this session (not kicked)
    connections = db.query(ConnectedStudent).filter(
        ConnectedStudent.session_id == session_id,
        ConnectedStudent.is_kicked == False,
    ).all()

    session = db.get(LectureSession, session_id)
    classroom_id = session.classroom_id if session else 1

    marked = 0
    for conn in connections:
        status = overrides.get(str(conn.student_id), "present")

        existing = db.query(Attendance).filter(
            Attendance.student_id == conn.student_id,
            Attendance.classroom_id == classroom_id,
        ).first()

        if existing:
            existing.status = status
        else:
            att = Attendance(
                student_id=conn.student_id,
                classroom_id=classroom_id,
                status=status,
            )
            db.add(att)
        marked += 1

    db.commit()
    return {"message": f"Attendance marked for {marked} students.", "count": marked}


# ==========================================
# AI Summary & Question Generator (MCQs/Flashcards)
# ==========================================

@router.post("/generate-quiz/{session_id}")
def generate_quiz(session_id: int, db: Session = Depends(get_db)):
    """Generate AI-powered quiz questions from lecture transcript."""
    subtitles = db.query(LiveSubtitle).filter(LiveSubtitle.session_id == session_id).all()
    transcript = " ".join([s.original_text for s in subtitles]) if subtitles else ""

    session = db.get(LectureSession, session_id)
    subject = session.subject if session else "General"

    # Use AI to generate questions
    quiz_data = ai_qa_service.generate_quiz_questions(
        transcript=transcript or "General lecture content.",
        subject=subject,
        count=5,
    )

    # Save to database
    for q_data in quiz_data:
        q = GeneratedQuestion(
            session_id=session_id,
            question_type=q_data.get("question_type", "mcq"),
            question=q_data.get("question", ""),
            options=q_data.get("options", []),
            correct_answer=q_data.get("correct_answer", ""),
            explanation=q_data.get("explanation", ""),
        )
        db.add(q)

    db.commit()
    return {"message": "Quiz questions generated successfully", "count": len(quiz_data)}


@router.get("/quiz/{session_id}")
def get_session_quiz(session_id: int, db: Session = Depends(get_db)):
    questions = db.query(GeneratedQuestion).filter(GeneratedQuestion.session_id == session_id).all()
    return [
        {
            "id": q.id,
            "type": q.question_type,
            "question": q.question,
            "options": q.options,
            "correct_answer": q.correct_answer,
            "explanation": q.explanation,
        }
        for q in questions
    ]