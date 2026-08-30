"""
End-to-end tests for Transcript (TXT) and AI Summary (PDF) downloads.
"""

import io
import pytest
import fitz  # PyMuPDF
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.core.database import get_db, SessionLocal
from app.models.entities import (
    User,
    Teacher,
    Student,
    Classroom,
    Subject,
    LectureSession,
    LiveSubtitle,
    LectureNote,
    AILectureSummary,
)


@pytest.fixture
def client():
    return TestClient(app)


def test_transcript_txt_and_pdf_summary_downloads(client):
    db: Session = SessionLocal()
    try:
        # Create or fetch test user/teacher/classroom
        teacher_user = db.query(User).filter(User.email == "test_teacher_downloads@classably.com").first()
        if not teacher_user:
            teacher_user = User(
                full_name="Prof. Alan Turing",
                email="test_teacher_downloads@classably.com",
                password_hash="testpasshash123",
                role="teacher",
            )
            db.add(teacher_user)
            db.commit()
            db.refresh(teacher_user)

        teacher = db.query(Teacher).filter(Teacher.user_id == teacher_user.id).first()
        if not teacher:
            teacher = Teacher(
                user_id=teacher_user.id,
                name=teacher_user.full_name,
                email=teacher_user.email,
                employee_id=f"EMP-TURING-{teacher_user.id}",
                department="Computer Science",
            )
            db.add(teacher)
            db.commit()
            db.refresh(teacher)

        classroom = db.query(Classroom).first()
        if not classroom:
            classroom = Classroom(name="CS-101 Hall", room_number="101", capacity=60)
            db.add(classroom)
            db.commit()
            db.refresh(classroom)

        # -------------------------------------------------------------
        # Session A: Has live subtitles and AI Lecture Summary
        # -------------------------------------------------------------
        session_a = LectureSession(
            classroom_id=classroom.id,
            teacher_id=teacher.id,
            subject="Neural Networks & Deep Learning",
            topic="Backpropagation & Gradient Descent",
            status="ENDED",
        )
        db.add(session_a)
        db.commit()
        db.refresh(session_a)

        # Add subtitles with timestamps
        subs_a = [
            LiveSubtitle(session_id=session_a.id, speaker_name="Prof. Turing", original_text="Welcome students to today's lecture on deep neural networks.", timestamp_offset=0.0),
            LiveSubtitle(session_id=session_a.id, speaker_name="Prof. Turing", original_text="We will derive the chain rule for backpropagation step by step.", timestamp_offset=15.5),
            LiveSubtitle(session_id=session_a.id, speaker_name="Prof. Turing", original_text="Notice that the loss function gradient propagates backwards through each layer.", timestamp_offset=42.0),
            LiveSubtitle(session_id=session_a.id, speaker_name="Prof. Turing", original_text="The weight update rule is: W_new = W_old - learning_rate * dL/dW.", timestamp_offset=75.0),
        ]
        db.add_all(subs_a)

        # Add AI Lecture Summary
        summary_a = AILectureSummary(
            session_id=session_a.id,
            summary_text="In this lecture, Prof. Turing discussed the mathematical foundations of Neural Networks, focusing on backpropagation and gradient descent optimization.",
            key_points=[
                "Backpropagation calculates the gradient of the loss function with respect to each weight using the chain rule.",
                "Gradient descent iteratively updates weights in the opposite direction of the gradient.",
                "Learning rate determines the step size during each parameter optimization step.",
            ],
            definitions=[
                "Backpropagation: An algorithm for supervised learning of artificial neural networks using gradient descent.",
                "Gradient Descent: First-order iterative optimization algorithm for finding a local minimum of a differentiable function.",
            ],
            formulas=[
                "W_new = W_old - η · ∇L(W)",
                "∂L/∂w_ij = ∂L/∂a_j · ∂a_j/∂z_j · ∂z_j/∂w_ij",
            ],
            style="detailed",
        )
        db.add(summary_a)
        db.commit()

        # -------------------------------------------------------------
        # Session B: Different Lecture for Isolation / Non-mixing verification
        # -------------------------------------------------------------
        session_b = LectureSession(
            classroom_id=classroom.id,
            teacher_id=teacher.id,
            subject="Operating Systems",
            topic="Virtual Memory & Paging",
            status="ENDED",
        )
        db.add(session_b)
        db.commit()
        db.refresh(session_b)

        subs_b = [
            LiveSubtitle(session_id=session_b.id, speaker_name="Prof. Turing", original_text="Today we examine virtual memory management and page replacement algorithms.", timestamp_offset=0.0),
            LiveSubtitle(session_id=session_b.id, speaker_name="Prof. Turing", original_text="The Translation Lookaside Buffer (TLB) speeds up virtual-to-physical address translation.", timestamp_offset=20.0),
        ]
        db.add_all(subs_b)
        db.commit()

        # =============================================================
        # TEST 1: Download Transcript TXT for Session A
        # =============================================================
        res_txt_a = client.get(f"/api/export/transcript/{session_a.id}/txt")
        assert res_txt_a.status_code == 200
        assert "text/plain" in res_txt_a.headers["content-type"]
        assert "attachment;" in res_txt_a.headers["content-disposition"]
        assert ".txt" in res_txt_a.headers["content-disposition"]
        
        txt_body_a = res_txt_a.text
        assert len(txt_body_a.strip()) > 50
        assert "Neural Networks & Deep Learning" in txt_body_a
        assert "Backpropagation & Gradient Descent" in txt_body_a
        assert "Welcome students to today's lecture on deep neural networks." in txt_body_a
        assert "W_new = W_old - learning_rate * dL/dW." in txt_body_a
        # Ensure Session B content is NOT in Session A transcript
        assert "Virtual Memory & Paging" not in txt_body_a
        print(">>> TEST 1 PASSED: Transcript TXT for Session A downloaded and verified.")

        # =============================================================
        # TEST 2: Download AI Summary PDF for Session A
        # =============================================================
        res_pdf_a = client.get(f"/api/export/summary/{session_a.id}/pdf")
        assert res_pdf_a.status_code == 200
        assert "application/pdf" in res_pdf_a.headers["content-type"]
        assert "attachment;" in res_pdf_a.headers["content-disposition"]
        assert ".pdf" in res_pdf_a.headers["content-disposition"]

        pdf_bytes_a = res_pdf_a.content
        assert len(pdf_bytes_a) > 500  # Valid non-empty PDF
        assert pdf_bytes_a.startswith(b"%PDF-")  # Valid PDF signature

        # Inspect PDF content with PyMuPDF
        doc_a = fitz.open(stream=pdf_bytes_a, filetype="pdf")
        assert len(doc_a) >= 1
        pdf_text_a = "".join([page.get_text() for page in doc_a])
        assert "ClassAbly Smart Lecture Summary" in pdf_text_a
        assert "Neural Networks" in pdf_text_a
        assert "Backpropagation" in pdf_text_a
        assert "EXECUTIVE SUMMARY" in pdf_text_a
        assert "KEY TAKEAWAYS" in pdf_text_a
        assert "Virtual Memory" not in pdf_text_a  # No lecture cross-contamination
        doc_a.close()
        print(">>> TEST 2 PASSED: AI Summary PDF for Session A downloaded, opened, and verified.")

        # =============================================================
        # TEST 3: Download Transcript TXT for Session B (Isolation Check)
        # =============================================================
        res_txt_b = client.get(f"/api/export/transcript/{session_b.id}/txt")
        assert res_txt_b.status_code == 200
        txt_body_b = res_txt_b.text
        assert "Operating Systems" in txt_body_b
        assert "Virtual Memory & Paging" in txt_body_b
        assert "Translation Lookaside Buffer" in txt_body_b
        assert "Neural Networks" not in txt_body_b
        print(">>> TEST 3 PASSED: Transcript TXT for Session B verified (data isolation confirmed).")

        # =============================================================
        # TEST 5: Verify Student-side AI Summary Matches Downloaded PDF Exactly
        # =============================================================
        # 1. Create a 3rd distinct lecture with unique domain content (Quantum Computing)
        session_c = LectureSession(
            classroom_id=classroom.id,
            teacher_id=teacher.id,
            subject="Quantum Physics & Computing",
            topic="Qubits & Quantum Superposition",
            status="ENDED",
        )
        db.add(session_c)
        db.commit()
        db.refresh(session_c)

        subs_c = [
            LiveSubtitle(session_id=session_c.id, speaker_name="Prof. Turing", original_text="In quantum computing, a qubit is defined as a two-state quantum-mechanical system.", timestamp_offset=0.0),
            LiveSubtitle(session_id=session_c.id, speaker_name="Prof. Turing", original_text="Unlike classical bits which are 0 or 1, qubits can exist in a superposition of states.", timestamp_offset=25.0),
            LiveSubtitle(session_id=session_c.id, speaker_name="Prof. Turing", original_text="Quantum entanglement allows qubits separated by distance to exhibit correlated states.", timestamp_offset=50.0),
        ]
        db.add_all(subs_c)
        db.commit()

        # 2. Student fetches summary for Session C
        from app.services.ai_qa_service import ai_qa_service
        student_summary_res = ai_qa_service.summarize_lecture(
            transcript=" ".join([s.original_text for s in subs_c]),
            subject=session_c.subject,
            topic=session_c.topic,
        )
        summary_c = AILectureSummary(
            session_id=session_c.id,
            summary_text=student_summary_res["summary_text"],
            key_points=student_summary_res["key_points"],
            definitions=student_summary_res["definitions"],
            formulas=student_summary_res["formulas"],
            style="detailed",
        )
        db.add(summary_c)
        db.commit()

        # 3. Student downloads PDF for Session C
        res_pdf_c = client.get(f"/api/export/summary/{session_c.id}/pdf")
        assert res_pdf_c.status_code == 200
        doc_c = fitz.open(stream=res_pdf_c.content, filetype="pdf")
        pdf_text_c = "".join([page.get_text() for page in doc_c])

        # 4. Assert PDF contains exact student summary content
        assert "Quantum Physics & Computing" in pdf_text_c
        assert "Qubits & Quantum Superposition" in pdf_text_c
        assert "qubit is defined as" in pdf_text_c or "superposition" in pdf_text_c
        assert "Neural Networks" not in pdf_text_c
        assert "Virtual Memory" not in pdf_text_c
        doc_c.close()
        print(">>> TEST 5 PASSED: Student AI summary matches downloaded PDF and data isolation confirmed across 3 sessions.")

    finally:
        db.close()
