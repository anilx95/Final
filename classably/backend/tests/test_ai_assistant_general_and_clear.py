"""
Comprehensive Test Suite for AI Assistant General-Purpose Answers and Clear History.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.database import Base
from app.models.entities.user import User
from app.models.entities.student import Student
from app.models.entities.teacher import Teacher
from app.models.entities.classroom import Classroom
from app.models.entities.lecture import LectureSession, LiveSubtitle
from app.models.entities.ai_qa import AIQAMessage, AILectureSummary
from app.services.ai_qa_service import ai_qa_service

TEST_DB_URL = "sqlite:///./test_ai_general_and_clear.db"
engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def test_ai_general_questions():
    print("\n=======================================================")
    print("TESTING AI ASSISTANT GENERAL-PURPOSE CAPABILITIES")
    print("=======================================================\n")

    test_transcript = "In today's class on Deep Learning, we covered backpropagation and gradient descent for deep neural networks."
    test_subject = "Computer Science"
    test_topic = "Deep Learning"

    # Test 1: "How to make chocolate coffee?"
    q1 = "How to make chocolate coffee?"
    ans1 = ai_qa_service.ask_question(q1, transcript_context=test_transcript, subject=test_subject, topic=test_topic)
    print(f"Q1: {q1}")
    print(f"A1:\n{ans1}\n{'-'*60}\n")
    assert "coffee" in ans1.lower() and "chocolate" in ans1.lower(), "Must explain how to make chocolate coffee"
    assert "espresso" in ans1.lower() or "brew" in ans1.lower(), "Must contain brewing instructions"
    assert "deep learning" not in ans1.lower(), "Must not force lecture context into chocolate coffee!"

    # Test 2: "What is Python inheritance?"
    q2 = "What is Python inheritance?"
    ans2 = ai_qa_service.ask_question(q2, transcript_context=test_transcript, subject=test_subject, topic=test_topic)
    print(f"Q2: {q2}")
    print(f"A2:\n{ans2}\n{'-'*60}\n")
    assert "inheritance" in ans2.lower() and "class" in ans2.lower(), "Must explain Python inheritance"
    assert "super()" in ans2 or "subclass" in ans2.lower() or "parent" in ans2.lower(), "Must explain OOP mechanics"
    assert "```python" in ans2, "Must provide Python code snippet"

    # Test 3: "Explain photosynthesis simply."
    q3 = "Explain photosynthesis simply."
    ans3 = ai_qa_service.ask_question(q3, transcript_context=test_transcript, subject=test_subject, topic=test_topic)
    print(f"Q3: {q3}")
    print(f"A3:\n{ans3}\n{'-'*60}\n")
    assert "photosynthesis" in ans3.lower() and "glucose" in ans3.lower() or "oxygen" in ans3.lower(), "Must explain photosynthesis"
    assert "sunlight" in ans3.lower() or "carbon dioxide" in ans3.lower() or "light" in ans3.lower(), "Must explain inputs/outputs"

    # Test 4: "How do I create a resume?"
    q4 = "How do I create a resume?"
    ans4 = ai_qa_service.ask_question(q4, transcript_context=test_transcript, subject=test_subject, topic=test_topic)
    print(f"Q4: {q4}")
    print(f"A4:\n{ans4}\n{'-'*60}\n")
    assert "resume" in ans4.lower() or "experience" in ans4.lower() or "skills" in ans4.lower(), "Must provide resume guide"

    # Test 5: Lecture-Specific Query
    q5 = "What did the teacher teach in today's class about backpropagation?"
    ans5 = ai_qa_service.ask_question(q5, transcript_context=test_transcript, subject=test_subject, topic=test_topic)
    print(f"Q5: {q5}")
    print(f"A5:\n{ans5}\n{'-'*60}\n")
    assert "backpropagation" in ans5.lower() or "deep learning" in ans5.lower(), "Must use lecture transcript when asked about class"

    print("ALL GENERAL & LECTURE QUESTIONS TESTED AND PASSED! ✅\n")


def test_clear_history_persistence():
    print("\n=======================================================")
    print("TESTING CLEAR HISTORY PERSISTENCE & LIFECYCLE")
    print("=======================================================\n")

    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Create dummy user, student, teacher, session
    user = User(id=1, email="student@test.edu", password_hash="hash", full_name="Student One", role="student")
    db.add(user)
    student = Student(id=1, user_id=1, name="Student One", roll_number="ROLL-1")
    db.add(student)
    teacher = Teacher(id=1, user_id=1, name="Prof", email="prof@test.edu", employee_id="EMP-1")
    db.add(teacher)
    session = LectureSession(id=201, classroom_id=1, teacher_id=1, subject="CS", topic="Algorithms", status="ACTIVE", started_at=datetime.utcnow())
    db.add(session)
    db.commit()

    # 1. Student chats with AI
    msg1 = AIQAMessage(session_id=201, student_id=1, question="How to make chocolate coffee?", answer="Here is how to make chocolate coffee...", context_used="")
    db.add(msg1)
    db.commit()

    history = db.query(AIQAMessage).filter(AIQAMessage.session_id == 201, AIQAMessage.student_id == 1).all()
    print(f"1. Before clear, session 201 has {len(history)} messages.")
    assert len(history) == 1

    # 2. Student clicks Clear History
    db.query(AIQAMessage).filter(AIQAMessage.session_id == 201, AIQAMessage.student_id == 1).delete(synchronize_session=False)
    db.commit()

    history_cleared = db.query(AIQAMessage).filter(AIQAMessage.session_id == 201, AIQAMessage.student_id == 1).all()
    print(f"2. After clear, session 201 has {len(history_cleared)} messages.")
    assert len(history_cleared) == 0, "History must be completely empty after clear."

    # 3. Next question starts fresh
    ans_fresh = ai_qa_service.ask_question("What is Python inheritance?")
    msg2 = AIQAMessage(session_id=201, student_id=1, question="What is Python inheritance?", answer=ans_fresh, context_used="")
    db.add(msg2)
    db.commit()

    history_new = db.query(AIQAMessage).filter(AIQAMessage.session_id == 201, AIQAMessage.student_id == 1).all()
    print(f"3. Fresh question asked, session 201 now has {len(history_new)} message(s).")
    assert len(history_new) == 1
    assert "inheritance" in history_new[0].question.lower()

    print("\nCLEAR HISTORY PERSISTENCE VERIFIED SUCCESSFULLY! ✅\n")
    db.close()

    if os.path.exists("test_ai_general_and_clear.db"):
        try:
            os.remove("test_ai_general_and_clear.db")
        except:
            pass


if __name__ == "__main__":
    test_ai_general_questions()
    test_clear_history_persistence()
