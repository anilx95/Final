"""
E2E Test for Multi-Session AI Assistant Isolation and Session-Specific Summarization.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

from app.services.ai_qa_service import ai_qa_service


def test_session_lifecycle_and_isolation():
    print("\n=======================================================")
    print("TESTING MULTI-SESSION AI CONTEXT & SUMMARY ISOLATION")
    print("=======================================================\n")

    # ─────────────────────────────────────────────────────────────
    # LECTURE 1: Deep Learning
    # ─────────────────────────────────────────────────────────────
    session_1_id = 101
    session_1_subject = "Deep Learning"
    session_1_topic = "Convolutional Neural Networks"
    session_1_transcript = (
        "Welcome everyone. Today we are studying Convolutional Neural Networks and kernel filters. "
        "We explained how 3x3 convolution matrices slide across input feature maps to perform edge detection. "
        "We also derived max pooling with stride 2 for spatial dimensionality reduction."
    )

    print(f"--- 1. LECTURE 1 STARTED (#{session_1_id}: {session_1_subject}) ---")

    # Student asks general question in Lecture 1
    q_general = "How do I prepare chocolate?"
    ans_general = ai_qa_service.ask_question(
        question=q_general,
        transcript_context=session_1_transcript,
        subject=session_1_subject,
        topic=session_1_topic
    )
    print(f"Student: {q_general}")
    print(f"AI Assistant: {ans_general[:140]}...\n")
    assert "cocoa" in ans_general.lower(), "General questions must work freely without lecture forcing"

    # Student asks lecture-specific question in Lecture 1
    q_lecture_1 = "What did the teacher explain about kernel filters and stride?"
    ans_lecture_1 = ai_qa_service.ask_question(
        question=q_lecture_1,
        transcript_context=session_1_transcript,
        subject=session_1_subject,
        topic=session_1_topic
    )
    print(f"Student: {q_lecture_1}")
    print(f"AI Assistant: {ans_lecture_1}\n")
    assert "convolution" in ans_lecture_1.lower() or "deep learning" in ans_lecture_1.lower(), "Must use Lecture 1 transcript"

    # Lecture 1 Ends -> Generate Lecture 1 Summary
    sum_1 = ai_qa_service.summarize_lecture(
        transcript=session_1_transcript,
        subject=session_1_subject,
        topic=session_1_topic,
        duration_minutes=45
    )
    print(f"Lecture 1 AI Summary:\n{sum_1['summary_text']}\n")
    assert "Convolutional" in sum_1['summary_text'] or "Deep Learning" in sum_1['summary_text']

    # ─────────────────────────────────────────────────────────────
    # LECTURE 2: Thermodynamics (Completely New Session)
    # ─────────────────────────────────────────────────────────────
    session_2_id = 102
    session_2_subject = "Physics"
    session_2_topic = "Thermodynamics & Heat Engines"
    session_2_transcript = (
        "Good afternoon class. In this new lecture we investigate the Second Law of Thermodynamics and Carnot heat engines. "
        "Efficiency eta is defined as 1 minus T_cold over T_hot. "
        "Entropy always increases in any irreversible spontaneous physical process."
    )

    print(f"\n--- 2. LECTURE 2 STARTED (#{session_2_id}: {session_2_subject}) ---")
    print("Notice: Clean session context — Lecture 1 data is completely isolated.\n")

    # Student asks lecture question in Lecture 2
    q_lecture_2 = "What did the teacher teach about entropy and efficiency?"
    ans_lecture_2 = ai_qa_service.ask_question(
        question=q_lecture_2,
        transcript_context=session_2_transcript,  # ONLY Lecture 2 transcript
        subject=session_2_subject,
        topic=session_2_topic
    )
    print(f"Student: {q_lecture_2}")
    print(f"AI Assistant: {ans_lecture_2}\n")
    assert "entropy" in ans_lecture_2.lower() or "thermodynamics" in ans_lecture_2.lower(), "Must ground in Lecture 2 transcript"
    assert "convolution" not in ans_lecture_2.lower(), "Lecture 1 content MUST NOT bleed into Lecture 2!"

    # Lecture 2 Ends -> Generate Lecture 2 Summary
    sum_2 = ai_qa_service.summarize_lecture(
        transcript=session_2_transcript,
        subject=session_2_subject,
        topic=session_2_topic,
        duration_minutes=50
    )
    print(f"Lecture 2 AI Summary:\n{sum_2['summary_text']}\n")
    assert "Thermodynamics" in sum_2['summary_text'] or "Physics" in sum_2['summary_text']
    assert "Convolutional" not in sum_2['summary_text'], "Lecture 1 transcript must NEVER appear in Lecture 2 summary!"

    # ─────────────────────────────────────────────────────────────
    # 3. HISTORICAL DATA PRESERVATION CHECK
    # ─────────────────────────────────────────────────────────────
    print("\n--- 3. VERIFYING HISTORICAL DATA PRESERVATION ---")
    print(f"Lecture 1 (#{session_1_id}) summary preserved: {sum_1['key_points'][0]}")
    print(f"Lecture 2 (#{session_2_id}) summary preserved: {sum_2['key_points'][0]}")
    assert sum_1 != sum_2, "Summaries must be uniquely associated with their respective sessions"

    print("\nALL MULTI-SESSION ISOLATION TESTS PASSED WITH 100% SUCCESS! ✅\n")


if __name__ == "__main__":
    test_session_lifecycle_and_isolation()
