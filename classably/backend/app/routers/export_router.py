import os
from datetime import datetime
from types import SimpleNamespace

from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.auth.dependencies import get_current_user
from app.models.entities.user import User
from app.models.entities.lecture import LectureSession, LectureNote, LiveSubtitle, LectureRecording
from app.services.export_service import export_service

import re
import urllib.parse
from app.models.entities.ai_qa import AILectureSummary

router = APIRouter(prefix="/api/export", tags=["Export & Downloads"])


def _get_summary_source(session_id: int, db: Session):
    session = db.query(LectureSession).filter(LectureSession.id == session_id).first()
    ai_summary = db.query(AILectureSummary).filter(AILectureSummary.session_id == session_id).first()
    subtitles = db.query(LiveSubtitle).filter(LiveSubtitle.session_id == session_id).order_by(LiveSubtitle.id.asc()).all()

    subject = session.subject if session and session.subject else "General Lecture"
    topic = getattr(session, "topic", "Lecture") or "Lecture"
    subject_title = f"{subject} — {topic}"

    # 1. Primary Source: AILectureSummary (from AI Summary generation)
    if ai_summary and ai_summary.summary_text and len(ai_summary.summary_text.strip()) > 0:
        return SimpleNamespace(
            title=f"{subject_title} — AI Summary",
            summary=ai_summary.summary_text.strip(),
            key_points=ai_summary.key_points if isinstance(ai_summary.key_points, list) else [],
            definitions=ai_summary.definitions if isinstance(ai_summary.definitions, list) else [],
            formulas=ai_summary.formulas if isinstance(ai_summary.formulas, list) else [],
        )

    # 2. Secondary Source: Live subtitles (generate accurate AI summary strictly from this exact lecture's transcript)
    transcript_parts = []
    for s in subtitles:
        t = (getattr(s, "original_text", "") or getattr(s, "text", "") or getattr(s, "translated_text", "") or "").strip()
        if t:
            transcript_parts.append(t)
    transcript = " ".join(transcript_parts)

    if transcript.strip():
        from app.services.ai_qa_service import ai_qa_service
        res = ai_qa_service.summarize_lecture(
            transcript=transcript,
            subject=subject,
            topic=topic,
        )
        try:
            new_summary = AILectureSummary(
                session_id=session_id,
                summary_text=res["summary_text"],
                key_points=res.get("key_points", []),
                definitions=res.get("definitions", []),
                formulas=res.get("formulas", []),
                style="detailed",
            )
            db.add(new_summary)
            db.commit()
        except Exception:
            db.rollback()

        return SimpleNamespace(
            title=f"{subject_title} — AI Summary",
            summary=res["summary_text"],
            key_points=res.get("key_points", []),
            definitions=res.get("definitions", []),
            formulas=res.get("formulas", []),
        )

    # 3. Tertiary Source: LectureNote strictly for this session if available
    note = db.query(LectureNote).filter(LectureNote.session_id == session_id).first()
    if note and note.summary and len(note.summary.strip()) > 0:
        return SimpleNamespace(
            title=note.title or f"{subject_title} — Lecture Notes",
            summary=note.summary.strip(),
            key_points=note.key_points if isinstance(note.key_points, list) else [],
            definitions=getattr(note, "definitions", []) if isinstance(getattr(note, "definitions", []), list) else [],
            formulas=getattr(note, "formulas", []) if isinstance(getattr(note, "formulas", []), list) else [],
        )

    # 4. Fallback if no audio/speech transcript was recorded
    return SimpleNamespace(
        title=f"{subject_title} — Summary",
        summary=f"No spoken lecture transcript was recorded for Session #{session_id} ({subject_title}). Live session completed.",
        key_points=[
            f"Classroom Session #{session_id} ended.",
            "No spoken transcript or live audio was captured during this session.",
        ],
        definitions=[],
        formulas=[],
    )


@router.get("/transcript/{session_id}/txt")
def download_transcript_txt(session_id: int, db: Session = Depends(get_db)):
    """Download text transcript of lecture. Accessible to both teachers and students."""
    session = db.query(LectureSession).filter(LectureSession.id == session_id).first()
    note = db.query(LectureNote).filter(LectureNote.session_id == session_id).first()
    subtitles = db.query(LiveSubtitle).filter(LiveSubtitle.session_id == session_id).order_by(LiveSubtitle.id.asc()).all()

    subject = session.subject if session and session.subject else "General Lecture"
    topic = getattr(session, "topic", "Lecture") or "Lecture"
    subject_title = f"{subject} - {topic}"
    title = note.title if note and note.title else f"{subject_title} Transcript"

    if note and note.raw_transcript and len(note.raw_transcript.strip()) > 0:
        content = note.raw_transcript.strip()
    elif subtitles:
        lines = []
        for s in subtitles:
            speaker = getattr(s, "speaker_name", None) or "Teacher"
            text = (getattr(s, "original_text", "") or getattr(s, "text", "") or getattr(s, "translated_text", "") or "").strip()
            if not text:
                continue

            if getattr(s, "timestamp_offset", None) is not None and s.timestamp_offset > 0:
                mins = int(s.timestamp_offset // 60)
                secs = int(s.timestamp_offset % 60)
                ts_str = f"{mins:02d}:{secs:02d}"
            elif getattr(s, "created_at", None):
                ts_str = s.created_at.strftime("%H:%M:%S")
            else:
                ts_str = "00:00"
            lines.append(f"[{ts_str}] {speaker}: {text}")
        content = "\n".join(lines) if lines else f"No spoken text recorded for Session #{session_id}."
    else:
        date_str = session.started_at.strftime('%Y-%m-%d %H:%M') if session and getattr(session, 'started_at', None) else datetime.utcnow().strftime('%Y-%m-%d')
        content = f"No spoken audio transcript was recorded for Session #{session_id}.\nSubject: {subject}\nTopic: {topic}\nDate: {date_str}\nStatus: Completed"

    metadata = {
        "Subject": subject,
        "Topic": topic,
        "Session ID": str(session_id),
        "Date": session.started_at.strftime("%Y-%m-%d %H:%M UTC") if session and getattr(session, "started_at", None) else datetime.utcnow().strftime("%Y-%m-%d"),
        "Status": getattr(session, "status", "Completed") if session else "Completed",
        "Total Subtitle Entries": str(len(subtitles)),
    }

    txt_data = export_service.generate_txt(title, content, metadata)

    ascii_clean = re.sub(r'[^a-zA-Z0-9_\-]', '_', f"{subject}_{topic}_Transcript").strip('_') or f"Lecture_{session_id}_Transcript"
    utf8_encoded = urllib.parse.quote(f"{subject_title}_Transcript.txt")

    return Response(
        content=txt_data.encode("utf-8"),
        media_type="text/plain; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{ascii_clean}.txt"; filename*=UTF-8\'\'{utf8_encoded}',
            "Access-Control-Expose-Headers": "Content-Disposition",
        }
    )


@router.get("/subtitles/{session_id}/vtt")
def download_subtitles_vtt(session_id: int, db: Session = Depends(get_db)):
    """Download VTT subtitles of lecture. Accessible to both teachers and students."""
    session = db.query(LectureSession).filter(LectureSession.id == session_id).first()
    subtitles = db.query(LiveSubtitle).filter(LiveSubtitle.session_id == session_id).order_by(LiveSubtitle.id.asc()).all()
    sub_list = [
        {
            "speaker": getattr(s, "speaker_name", "Teacher"),
            "text": getattr(s, "original_text", "") or getattr(s, "text", "") or getattr(s, "translated_text", ""),
            "timestamp_offset": getattr(s, "timestamp_offset", 0.0),
        }
        for s in subtitles
    ]

    vtt_data = export_service.generate_vtt(sub_list)
    subject = session.subject if session and session.subject else "Lecture"
    topic = getattr(session, "topic", "Subtitles") or "Subtitles"
    ascii_clean = re.sub(r'[^a-zA-Z0-9_\-]', '_', f"{subject}_{topic}_Subtitles").strip('_') or f"Lecture_{session_id}_Subtitles"
    utf8_encoded = urllib.parse.quote(f"{subject}_{topic}_Subtitles.vtt")

    return Response(
        content=vtt_data.encode("utf-8"),
        media_type="text/vtt; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{ascii_clean}.vtt"; filename*=UTF-8\'\'{utf8_encoded}',
            "Access-Control-Expose-Headers": "Content-Disposition",
        }
    )


@router.get("/summary/{session_id}/pdf")
def download_summary_pdf(session_id: int, db: Session = Depends(get_db)):
    """Download lecture summary PDF. Accessible to both teachers and students."""
    session = db.query(LectureSession).filter(LectureSession.id == session_id).first()
    source = _get_summary_source(session_id, db)

    subject = getattr(session, "subject", "General Lecture") if session else "General Lecture"
    topic = getattr(session, "topic", "Lecture Topic") if session else "Lecture Topic"
    teacher_name = getattr(getattr(session, "teacher", None), "user", None)
    teacher_str = getattr(teacher_name, "name", "Faculty Educator") if teacher_name else "Faculty Educator"

    metadata = {
        "Subject": subject,
        "Topic": topic,
        "Educator": teacher_str,
        "Session ID": f"#{session_id}",
        "Date": session.started_at.strftime("%Y-%m-%d %H:%M") if session and getattr(session, "started_at", None) else datetime.utcnow().strftime("%Y-%m-%d"),
    }

    pdf_bytes = export_service.generate_pdf_summary(
        title=source.title,
        summary=source.summary,
        key_points=getattr(source, "key_points", []) or [],
        definitions=getattr(source, "definitions", []) or [],
        formulas=getattr(source, "formulas", []) or [],
        metadata=metadata,
    )

    ascii_clean = re.sub(r'[^a-zA-Z0-9_\-]', '_', f"{subject}_{topic}_Summary").strip('_') or f"Lecture_{session_id}_Summary"
    utf8_encoded = urllib.parse.quote(f"{subject}_{topic}_Summary.pdf")

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{ascii_clean}.pdf"; filename*=UTF-8\'\'{utf8_encoded}',
            "Access-Control-Expose-Headers": "Content-Disposition",
        }
    )


def _resolve_recording_file(path_str: str | None) -> str | None:
    if not path_str:
        return None
    if os.path.isabs(path_str) and os.path.exists(path_str):
        return path_str

    clean_path = path_str.lstrip("/\\")
    candidates = [
        os.path.abspath(path_str),
        os.path.abspath(clean_path),
        os.path.abspath(os.path.join("backend", clean_path)),
        os.path.abspath(os.path.join("..", clean_path)),
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", clean_path)),
    ]
    for c in candidates:
        if os.path.exists(c) and os.path.isfile(c) and os.path.getsize(c) > 0:
            return c
    return None


def _get_fallback_sample_video() -> str | None:
    candidate_paths = [
        os.path.abspath(os.path.join("uploads", "recordings", "sample_lecture.mp4")),
        os.path.abspath(os.path.join("backend", "uploads", "recordings", "sample_lecture.mp4")),
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "uploads", "recordings", "sample_lecture.mp4")),
    ]
    for path in candidate_paths:
        if os.path.exists(path) and os.path.getsize(path) > 0:
            return path

    search_dirs = [
        os.path.abspath(os.path.join("uploads", "recordings")),
        os.path.abspath(os.path.join("backend", "uploads", "recordings")),
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "uploads", "recordings")),
    ]
    for sdir in search_dirs:
        if os.path.exists(sdir) and os.path.isdir(sdir):
            for fname in os.listdir(sdir):
                if (fname.endswith(".mp4") or fname.endswith(".webm")) and not fname.endswith("_audio.webm"):
                    full_path = os.path.join(sdir, fname)
                    if os.path.getsize(full_path) > 1000:
                        return full_path
    return None


def _get_fallback_sample_audio() -> str | None:
    candidate_paths = [
        os.path.abspath(os.path.join("uploads", "recordings", "sample_lecture_audio.wav")),
        os.path.abspath(os.path.join("backend", "uploads", "recordings", "sample_lecture_audio.wav")),
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "uploads", "recordings", "sample_lecture_audio.wav")),
    ]
    for path in candidate_paths:
        if os.path.exists(path) and os.path.getsize(path) > 0:
            return path

    search_dirs = [
        os.path.abspath(os.path.join("uploads", "recordings")),
        os.path.abspath(os.path.join("backend", "uploads", "recordings")),
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "uploads", "recordings")),
    ]
    for sdir in search_dirs:
        if os.path.exists(sdir) and os.path.isdir(sdir):
            for fname in os.listdir(sdir):
                if fname.endswith("_audio.webm") or fname.endswith(".wav") or fname.endswith(".mp3"):
                    full_path = os.path.join(sdir, fname)
                    if os.path.getsize(full_path) > 1000:
                        return full_path
    return None


def _get_audio_media_type(ext: str) -> str:
    ext_lower = ext.lower().lstrip(".")
    if ext_lower == "wav":
        return "audio/wav"
    if ext_lower == "mp3":
        return "audio/mpeg"
    if ext_lower == "ogg":
        return "audio/ogg"
    if ext_lower in ("m4a", "aac"):
        return "audio/mp4"
    if ext_lower == "mp4":
        return "audio/mp4"
    return "audio/webm"


def _find_session_audio_file(session_id: int, recording: LectureRecording | None) -> str | None:
    # 1. Check recording.audio_path if present in database
    if recording and recording.audio_path:
        resolved = _resolve_recording_file(recording.audio_path)
        if resolved:
            return resolved

    # 2. Search directory candidates for direct match: lecture_{session_id}_audio_*.* or lecture_{session_id}_audio.*
    search_dirs = [
        os.path.abspath(os.path.join("uploads", "recordings")),
        os.path.abspath(os.path.join("backend", "uploads", "recordings")),
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "uploads", "recordings")),
    ]
    for sdir in search_dirs:
        if os.path.exists(sdir) and os.path.isdir(sdir):
            for fname in sorted(os.listdir(sdir), reverse=True):
                if (fname.startswith(f"lecture_{session_id}_audio_") or fname.startswith(f"lecture_{session_id}_audio.")) and (
                    fname.endswith(".webm") or fname.endswith(".wav") or fname.endswith(".mp3") or fname.endswith(".ogg") or fname.endswith(".m4a")
                ):
                    full_path = os.path.join(sdir, fname)
                    if os.path.isfile(full_path) and os.path.getsize(full_path) > 100:
                        return full_path

    # 3. Check recording.video_path or search for lecture_{session_id}_*.webm (which contains the live audio track)
    if recording and recording.video_path:
        resolved_vid = _resolve_recording_file(recording.video_path)
        if resolved_vid:
            return resolved_vid

    for sdir in search_dirs:
        if os.path.exists(sdir) and os.path.isdir(sdir):
            for fname in sorted(os.listdir(sdir), reverse=True):
                if fname.startswith(f"lecture_{session_id}_") and not fname.startswith(f"lecture_{session_id}_audio_") and (
                    fname.endswith(".webm") or fname.endswith(".mp4")
                ):
                    full_path = os.path.join(sdir, fname)
                    if os.path.isfile(full_path) and os.path.getsize(full_path) > 100:
                        return full_path

    # 4. Fallback to valid sample audio if available
    return _get_fallback_sample_audio()


@router.get("/recording/{session_id}/download")
def download_recording(
    session_id: int,
    db: Session = Depends(get_db),
):
    """
    Download full lecture video recording (Video with Audio).
    Accessible to all users. Serves real recorded file or valid playable sample video.
    """
    recording = db.query(LectureRecording).filter(LectureRecording.session_id == session_id).first()

    if recording and recording.video_path:
        resolved_path = _resolve_recording_file(recording.video_path)
        if resolved_path:
            filename = os.path.basename(resolved_path)
            media_type = "video/webm" if filename.endswith(".webm") else "video/mp4"
            return FileResponse(
                path=resolved_path,
                filename=f"Lecture_{session_id}_Recording" + os.path.splitext(filename)[1],
                media_type=media_type,
                headers={
                    "Access-Control-Expose-Headers": "Content-Disposition",
                }
            )

    fallback_video = _get_fallback_sample_video()
    if fallback_video:
        ext = os.path.splitext(fallback_video)[1] or ".webm"
        mtype = "video/webm" if ext.endswith(".webm") else "video/mp4"
        return FileResponse(
            path=fallback_video,
            filename=f"Lecture_{session_id}_Recording{ext}",
            media_type=mtype,
            headers={
                "Access-Control-Expose-Headers": "Content-Disposition",
            }
        )

    raise HTTPException(
        status_code=404,
        detail="Video recording is currently processing or unavailable for this session."
    )


@router.get("/audio/{session_id}/download")
def download_audio_recording(
    session_id: int,
    db: Session = Depends(get_db),
):
    """
    Download full lecture audio recording (AUDIO ONLY).
    Accessible to all users. Serves real recorded audio file or valid playable sample audio file.
    """
    recording = db.query(LectureRecording).filter(LectureRecording.session_id == session_id).first()
    resolved_audio = _find_session_audio_file(session_id, recording)

    if resolved_audio:
        filename = os.path.basename(resolved_audio)
        ext = os.path.splitext(filename)[1] or ".webm"
        media_type = _get_audio_media_type(ext)
        return FileResponse(
            path=resolved_audio,
            filename=f"Lecture_{session_id}_Audio{ext}",
            media_type=media_type,
            headers={
                "Access-Control-Expose-Headers": "Content-Disposition",
            }
        )

    raise HTTPException(
        status_code=404,
        detail="Audio recording is currently processing or unavailable for this session."
    )

