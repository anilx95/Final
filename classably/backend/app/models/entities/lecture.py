from datetime import datetime
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean, Text, JSON, Float
from sqlalchemy.orm import relationship

from app.core.database import Base


class LectureSession(Base):
    __tablename__ = "lecture_sessions"

    id = Column(Integer, primary_key=True, index=True)
    classroom_id = Column(Integer, ForeignKey("classrooms.id"), nullable=False)
    teacher_id = Column(Integer, ForeignKey("teachers.id"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=True)

    subject = Column(String, nullable=False, default="General Lecture")
    topic = Column(String(200), nullable=True)
    status = Column(String(20), default="ACTIVE")  # ACTIVE, PAUSED, ENDED
    started_at = Column(DateTime, default=datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)

    classroom = relationship("Classroom", back_populates="lecture_sessions")
    teacher = relationship("Teacher", back_populates="lecture_sessions")
    subject_rel = relationship("Subject", back_populates="lecture_sessions")

    subtitles = relationship("LiveSubtitle", back_populates="session", cascade="all, delete-orphan")
    board_snapshots = relationship("BoardSnapshot", back_populates="session", cascade="all, delete-orphan")
    notes = relationship("LectureNote", back_populates="session_rel", cascade="all, delete-orphan")
    chapters = relationship("LectureChapter", back_populates="session", cascade="all, delete-orphan")
    generated_questions = relationship("GeneratedQuestion", back_populates="session", cascade="all, delete-orphan")
    raise_hand_events = relationship("RaiseHandEvent", back_populates="session", cascade="all, delete-orphan")
    qa_items = relationship("QAItem", back_populates="session", cascade="all, delete-orphan")
    recordings = relationship("LectureRecording", back_populates="session", cascade="all, delete-orphan")
    ai_qa_messages = relationship("AIQAMessage", back_populates="session", cascade="all, delete-orphan")
    ai_summary = relationship("AILectureSummary", back_populates="session", uselist=False, cascade="all, delete-orphan")
    connected_students = relationship("ConnectedStudent", back_populates="session", cascade="all, delete-orphan")


class LiveSubtitle(Base):
    __tablename__ = "live_subtitles"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("lecture_sessions.id"), nullable=False)

    speaker_name = Column(String(100), default="Teacher")
    original_text = Column(Text, nullable=False)
    translated_text = Column(Text, nullable=True)
    language = Column(String(10), default="en")
    timestamp_offset = Column(Float, default=0.0)  # seconds from start
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("LectureSession", back_populates="subtitles")


class LiveLearningState(Base):
    """Versioned, incremental learning state produced from finalized speech."""
    __tablename__ = "live_learning_states"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("lecture_sessions.id"), nullable=False, unique=True, index=True)
    processed_subtitle_id = Column(Integer, nullable=True)
    version = Column(Integer, nullable=False, default=0)
    summary = Column(JSON, default=dict)
    topic_map = Column(JSON, default=dict)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    session = relationship("LectureSession")


class BoardSnapshot(Base):
    __tablename__ = "board_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("lecture_sessions.id"), nullable=False)

    image_path = Column(String(500), nullable=False)
    ocr_text = Column(Text, nullable=True)
    enhanced_image_path = Column(String(500), nullable=True)
    detected_elements = Column(JSON, default=dict)  # formulas, diagrams, text blocks
    timestamp_offset = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("LectureSession", back_populates="board_snapshots")


class LectureNote(Base):
    __tablename__ = "lecture_notes"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("lecture_sessions.id"), nullable=True)
    classroom_id = Column(Integer, ForeignKey("classrooms.id"), nullable=True)

    title = Column(String(200), default="Untitled Lecture")
    raw_transcript = Column(Text, default="")
    summary = Column(Text, default="")
    key_points = Column(JSON, default=list)
    formulas = Column(JSON, default=list)
    definitions = Column(JSON, default=list)
    language = Column(String(10), default="en")
    created_at = Column(DateTime, default=datetime.utcnow)
    synced = Column(Boolean, default=True)

    session_rel = relationship("LectureSession", back_populates="notes")


class LectureChapter(Base):
    __tablename__ = "lecture_chapters"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("lecture_sessions.id"), nullable=False)

    title = Column(String(200), nullable=False)
    start_time = Column(Float, nullable=False)  # in seconds
    end_time = Column(Float, nullable=False)
    summary = Column(Text, nullable=True)

    session = relationship("LectureSession", back_populates="chapters")


class GeneratedQuestion(Base):
    __tablename__ = "generated_questions"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("lecture_sessions.id"), nullable=False)

    question_type = Column(String(20), default="mcq")  # mcq, flashcard, short_answer
    question = Column(Text, nullable=False)
    options = Column(JSON, default=list)  # for MCQ
    correct_answer = Column(Text, nullable=False)
    explanation = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("LectureSession", back_populates="generated_questions")


class LectureRecording(Base):
    __tablename__ = "lecture_recordings"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("lecture_sessions.id"), nullable=False)

    video_path = Column(String(500), nullable=True)
    audio_path = Column(String(500), nullable=True)
    duration_seconds = Column(Float, default=0.0)
    file_size_bytes = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("LectureSession", back_populates="recordings")
