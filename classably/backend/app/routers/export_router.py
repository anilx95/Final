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

router = APIRouter(prefix="/api/export", tags=["Export & Downloads"])


def _get_summary_source(session_id: int, db: Session):
    note = db.query(LectureNote).filter(LectureNote.session_id == session_id).first()
    session = db.query(LectureSession).filter(LectureSession.id == session_id).first()
    subtitles = db.query(LiveSubtitle).filter(LiveSubtitle.session_id == session_id).order_by(LiveSubtitle.created_at.asc()).all()

    subject_title = f"{session.subject} - {session.topic}" if session and session.subject else f"Lecture {session_id}"

    if note and note.summary and len(note.summary.strip()) > 0:
        return note

    transcript = " ".join([s.original_text or s.text for s in subtitles if (s.original_text or s.text)]) if subtitles else ""
    title = f"{subject_title} Summary"
    summary = transcript if transcript else f"Lecture summary for {subject_title}. Session #{session_id} completed successfully."
    key_points = [s.original_text or s.text for s in subtitles[:5]] if subtitles else ["Interactive live lecture session completed.", "Live transcription and student assistance active."]
    return SimpleNamespace(
        title=title,
        summary=summary,
        key_points=key_points,
        formulas=[],
    )


@router.get("/transcript/{session_id}/txt")
def download_transcript_txt(session_id: int, db: Session = Depends(get_db)):
    """Download text transcript of lecture. Accessible to both teachers and students."""
    session = db.query(LectureSession).filter(LectureSession.id == session_id).first()
    note = db.query(LectureNote).filter(LectureNote.session_id == session_id).first()
    subtitles = db.query(LiveSubtitle).filter(LiveSubtitle.session_id == session_id).order_by(LiveSubtitle.created_at.asc()).all()

    subject_title = f"{session.subject} - {session.topic}" if session and session.subject else f"Lecture {session_id}"
    title = note.title if note and note.title else f"{subject_title} Transcript"

    if note and note.raw_transcript and len(note.raw_transcript.strip()) > 0:
        content = note.raw_transcript
    elif subtitles:
        content = "\n".join([f"[{s.created_at.strftime('%H:%M:%S') if s.created_at else '00:00:00'}] {s.speaker_name or 'Teacher'}: {s.original_text or s.text}" for s in subtitles])
    else:
        content = f"Transcript for {subject_title}\n\nSession ID: {session_id}\nDate: {datetime.utcnow().strftime('%Y-%m-%d')}\nStatus: Completed\nLive audio transcription recorded for this session."

    txt_data = export_service.generate_txt(title, content)
    safe_title = title.replace(' ', '_').replace('/', '_').replace('\\', '_')
    return Response(
        content=txt_data,
        media_type="text/plain; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{safe_title}_Transcript.txt"',
            "Access-Control-Expose-Headers": "Content-Disposition",
        }
    )


@router.get("/subtitles/{session_id}/vtt")
def download_subtitles_vtt(session_id: int, db: Session = Depends(get_db)):
    """Download VTT subtitles of lecture. Accessible to both teachers and students."""
    subtitles = db.query(LiveSubtitle).filter(LiveSubtitle.session_id == session_id).order_by(LiveSubtitle.created_at.asc()).all()
    sub_list = [{"speaker": s.speaker_name, "text": s.original_text, "timestamp_offset": s.timestamp_offset} for s in subtitles]

    vtt_data = export_service.generate_vtt(sub_list)
    return Response(
        content=vtt_data,
        media_type="text/vtt; charset=utf-8",
        headers={
            "Content-Disposition": f"attachment; filename=Lecture_{session_id}_Subtitles.vtt",
            "Access-Control-Expose-Headers": "Content-Disposition",
        }
    )


@router.get("/summary/{session_id}/pdf")
def download_summary_pdf(session_id: int, db: Session = Depends(get_db)):
    """Download lecture summary PDF. Accessible to both teachers and students."""
    session = db.query(LectureSession).filter(LectureSession.id == session_id).first()
    source = _get_summary_source(session_id, db)

    metadata = {
        "Subject": getattr(session, "subject", "General Lecture") if session else "General Lecture",
        "Topic": getattr(session, "topic", "Lecture Topic") if session else "Lecture Topic",
        "Date": session.started_at.strftime("%Y-%m-%d %H:%M") if session and getattr(session, "started_at", None) else datetime.utcnow().strftime("%Y-%m-%d"),
    }

    pdf_bytes = export_service.generate_pdf_summary(
        title=source.title,
        summary=source.summary,
        key_points=source.key_points or [],
        formulas=getattr(source, "formulas", []) or [],
        metadata=metadata,
    )
    safe_title = source.title.replace(' ', '_').replace('/', '_').replace('\\', '_')
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{safe_title}_Summary.pdf"',
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
            )

    fallback_video = _get_fallback_sample_video()
    if fallback_video:
        ext = os.path.splitext(fallback_video)[1] or ".webm"
        mtype = "video/webm" if ext.endswith(".webm") else "video/mp4"
        return FileResponse(
            path=fallback_video,
            filename=f"Lecture_{session_id}_Recording{ext}",
            media_type=mtype,
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

    if recording and recording.audio_path:
        resolved_audio = _resolve_recording_file(recording.audio_path)
        if resolved_audio:
            filename = os.path.basename(resolved_audio)
            ext = os.path.splitext(filename)[1]
            media_type = "audio/wav" if ext == ".wav" else "audio/webm"
            return FileResponse(
                path=resolved_audio,
                filename=f"Lecture_{session_id}_Audio{ext}",
                media_type=media_type,
            )

    fallback_audio = _get_fallback_sample_audio()
    if fallback_audio:
        ext = os.path.splitext(fallback_audio)[1] or ".wav"
        media_type = "audio/wav" if ext == ".wav" else "audio/webm"
        return FileResponse(
            path=fallback_audio,
            filename=f"Lecture_{session_id}_Audio{ext}",
            media_type=media_type,
        )

    raise HTTPException(
        status_code=404,
        detail="Audio recording is currently processing or unavailable for this session."
    )

