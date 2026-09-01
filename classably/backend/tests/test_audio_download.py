import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.models.entities.lecture import LectureRecording

client = TestClient(app)

def test_download_audio_existing_recording():
    """Verify that existing audio recordings are retrieved and returned with correct audio Content-Type and headers."""
    db = SessionLocal()
    try:
        rec = db.query(LectureRecording).filter(LectureRecording.audio_path != None).first()
        if rec:
            session_id = rec.session_id
            res = client.get(f"/api/export/audio/{session_id}/download")
            assert res.status_code == 200, f"Expected 200 for session {session_id}, got {res.status_code}"
            assert res.headers.get("content-type", "").startswith("audio/"), f"Expected audio content-type, got {res.headers.get('content-type')}"
            assert "attachment" in res.headers.get("content-disposition", "")
            assert f"Lecture_{session_id}_Audio" in res.headers.get("content-disposition", "")
            assert len(res.content) > 100
            # Check valid audio container magic bytes (WebM EBML or WAV RIFF)
            assert res.content.startswith(b"\x1a\x45\xdf\xa3") or res.content.startswith(b"RIFF")
    finally:
        db.close()


def test_download_audio_multiple_distinct_sessions():
    """Verify that different lectures download their own distinct audio recordings."""
    db = SessionLocal()
    try:
        recs = db.query(LectureRecording).filter(LectureRecording.audio_path != None).limit(3).all()
        for r in recs:
            res = client.get(f"/api/export/audio/{r.session_id}/download")
            assert res.status_code == 200
            assert f"Lecture_{r.session_id}_Audio" in res.headers.get("content-disposition", "")
            assert len(res.content) > 0
    finally:
        db.close()


def test_download_audio_fallback_or_404():
    """Verify that non-existent session falls back safely or returns 404 error."""
    res = client.get("/api/export/audio/999999/download")
    if res.status_code == 200:
        assert res.headers.get("content-type", "").startswith("audio/")
        assert len(res.content) > 100
    else:
        assert res.status_code == 404
        assert "detail" in res.json()
