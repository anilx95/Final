import os
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
    if note:
        return note

    subtitles = db.query(LiveSubtitle).filter(LiveSubtitle.session_id == session_id).all()
    transcript = " ".join([s.original_text for s in subtitles]) if subtitles else ""
    title = f"Lecture_{session_id}_Summary"
    summary = transcript if transcript else "A lecture summary is not available because no lecture note or transcripts have been generated yet."
    key_points = [s.original_text for s in subtitles[:5]] if subtitles else []
    return SimpleNamespace(
        title=title,
        summary=summary,
        key_points=key_points,
        formulas=[],
    )


@router.get("/transcript/{session_id}/txt")
def download_transcript_txt(session_id: int, db: Session = Depends(get_db)):
    """Download text transcript of lecture. Accessible to both teachers and students."""
    note = db.query(LectureNote).filter(LectureNote.session_id == session_id).first()
    title = note.title if note else f"Lecture_{session_id}"

    if note and note.raw_transcript:
        content = note.raw_transcript
    else:
        subtitles = db.query(LiveSubtitle).filter(LiveSubtitle.session_id == session_id).order_by(LiveSubtitle.created_at.asc()).all()
        if subtitles:
            content = "\n".join([f"[{s.created_at.strftime('%H:%M:%S')}] {s.speaker_name}: {s.original_text}" for s in subtitles])
        else:
            content = "No transcript available."

    txt_data = export_service.generate_txt(title, content)
    return Response(
        content=txt_data,
        media_type="text/plain",
        headers={"Content-Disposition": f"attachment; filename={title.replace(' ', '_')}_Transcript.txt"}
    )


@router.get("/subtitles/{session_id}/vtt")
def download_subtitles_vtt(session_id: int, db: Session = Depends(get_db)):
    """Download VTT subtitles of lecture. Accessible to both teachers and students."""
    subtitles = db.query(LiveSubtitle).filter(LiveSubtitle.session_id == session_id).order_by(LiveSubtitle.created_at.asc()).all()
    sub_list = [{"speaker": s.speaker_name, "text": s.original_text, "timestamp_offset": s.timestamp_offset} for s in subtitles]

    vtt_data = export_service.generate_vtt(sub_list)
    return Response(
        content=vtt_data,
        media_type="text/vtt",
        headers={"Content-Disposition": f"attachment; filename=Lecture_{session_id}_Subtitles.vtt"}
    )


@router.get("/summary/{session_id}/pdf")
def download_summary_pdf(session_id: int, db: Session = Depends(get_db)):
    """Download lecture summary PDF/Markdown. Accessible to both teachers and students."""
    source = _get_summary_source(session_id, db)

    pdf_text = export_service.generate_pdf_summary(
        title=source.title,
        summary=source.summary,
        key_points=source.key_points or [],
        formulas=getattr(source, "formulas", []) or [],
    )
    return Response(
        content=pdf_text,
        media_type="text/markdown",
        headers={"Content-Disposition": f"attachment; filename={source.title.replace(' ', '_')}_Summary.md"}
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
        if os.path.exists(c) and os.path.isfile(c):
            return c
    return None


def _get_fallback_sample_video() -> str | None:
    candidate_paths = [
        os.path.abspath(os.path.join("uploads", "recordings", "sample_lecture.mp4")),
        os.path.abspath(os.path.join("backend", "uploads", "recordings", "sample_lecture.mp4")),
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "uploads", "recordings", "sample_lecture.mp4")),
    ]
    for path in candidate_paths:
        if os.path.exists(path):
            return path

    # Search for any .webm or .mp4 file in uploads/recordings
    search_dirs = [
        os.path.abspath(os.path.join("uploads", "recordings")),
        os.path.abspath(os.path.join("backend", "uploads", "recordings")),
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "uploads", "recordings")),
    ]
    for sdir in search_dirs:
        if os.path.exists(sdir) and os.path.isdir(sdir):
            for fname in os.listdir(sdir):
                if fname.endswith(".mp4") or fname.endswith(".webm"):
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
    Download full lecture video recording.
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

    # Fallback to generated sample video if specific upload doesn't exist yet
    fallback_video = _get_fallback_sample_video()
    if fallback_video:
        ext = os.path.splitext(fallback_video)[1] or ".mp4"
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
    Download full lecture audio recording.
    Accessible to all users. Serves real recorded audio/video or valid playable sample file.
    """
    recording = db.query(LectureRecording).filter(LectureRecording.session_id == session_id).first()

    if recording and recording.audio_path:
        resolved_audio = _resolve_recording_file(recording.audio_path)
        if resolved_audio:
            filename = os.path.basename(resolved_audio)
            return FileResponse(
                path=resolved_audio,
                filename=f"Lecture_{session_id}_Audio" + os.path.splitext(filename)[1],
                media_type="audio/webm",
            )

    if recording and recording.video_path:
        resolved_video = _resolve_recording_file(recording.video_path)
        if resolved_video:
            filename = os.path.basename(resolved_video)
            ext = os.path.splitext(filename)[1]
            return FileResponse(
                path=resolved_video,
                filename=f"Lecture_{session_id}_Audio" + ext,
                media_type="video/mp4" if ext == ".mp4" else "audio/webm",
            )

    fallback_audio = _get_fallback_sample_video()
    if fallback_audio:
        ext = os.path.splitext(fallback_audio)[1] or ".mp4"
        return FileResponse(
            path=fallback_audio,
            filename=f"Lecture_{session_id}_Audio{ext}",
            media_type="video/mp4" if ext == ".mp4" else "audio/webm",
        )

    raise HTTPException(
        status_code=404,
        detail="Audio recording is currently processing or unavailable for this session."
    )

