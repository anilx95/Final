"""
E2E Test for AI Assistant and Transcript-Grounded AI Lecture Summary.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

from app.services.ai_qa_service import ai_qa_service

def test_ai_qa_general_questions():
    print("\n--- 1. Testing General Knowledge / How-To (ChatGPT Mode) ---")
    
    # 1. Recipe
    ans_choco = ai_qa_service.ask_question("How do I prepare chocolate?")
    print("User: How do I prepare chocolate?")
    print(f"Assistant: {ans_choco[:160]}...\n")
    assert "cocoa" in ans_choco.lower() or "chocolate" in ans_choco.lower(), "Should provide chocolate recipe"

    # 2. Capital of France
    ans_france = ai_qa_service.ask_question("What is the capital of France?")
    print("User: What is the capital of France?")
    print(f"Assistant: {ans_france[:160]}...\n")
    assert "paris" in ans_france.lower(), "Should mention Paris"

    # 3. Bicycle repair
    ans_bike = ai_qa_service.ask_question("How do I fix a flat bicycle tire?")
    print("User: How do I fix a flat bicycle tire?")
    print(f"Assistant: {ans_bike[:160]}...\n")
    assert "tube" in ans_bike.lower() or "tire" in ans_bike.lower() or "patch" in ans_bike.lower(), "Should explain bicycle repair"

    # 4. Science
    ans_photo = ai_qa_service.ask_question("Explain photosynthesis.")
    print("User: Explain photosynthesis.")
    print(f"Assistant: {ans_photo[:160]}...\n")
    assert "glucose" in ans_photo.lower() or "light" in ans_photo.lower() or "chlorophyll" in ans_photo.lower() or "plant" in ans_photo.lower(), "Should explain photosynthesis"


def test_ai_qa_lecture_grounded():
    print("\n--- 2. Testing Lecture Grounded Question ---")
    transcript = "In today's class on Deep Learning we discussed convolutional layer kernel filters and max pooling for feature reduction."
    ans_lecture = ai_qa_service.ask_question(
        "What did the teacher teach about kernel filters?",
        transcript_context=transcript,
        subject="Deep Learning",
        topic="CNNs"
    )
    print("User: What did the teacher teach about kernel filters?")
    print(f"Assistant: {ans_lecture}\n")
    assert "convolutional" in ans_lecture.lower() or "deep learning" in ans_lecture.lower(), "Should ground answer in lecture context"


def test_lecture_summary():
    print("\n--- 3. Testing Transcript-Grounded Summary & Empty Transcript Handling ---")
    
    # 1. Empty transcript handling (No fake summaries!)
    empty_summary = ai_qa_service.summarize_lecture("", subject="Mathematics", topic="Calculus")
    print(f"Empty Transcript Result: {empty_summary['summary_text']}")
    assert "No spoken lecture transcript" in empty_summary["summary_text"], "Must not invent fake summary when transcript is empty"

    # 2. Real transcript summary
    real_transcript = (
        "Today we explored Newton's Second Law of Motion. Force equals mass times acceleration F = m * a. "
        "We derived the equation for a block sliding on a frictionless inclined plane. "
        "The acceleration is given by g times sine of theta. Next lecture we will introduce kinetic friction."
    )
    real_summary = ai_qa_service.summarize_lecture(real_transcript, subject="Physics", topic="Classical Mechanics")
    print(f"Real Transcript Summary Text:\n{real_summary['summary_text']}\n")
    print(f"Key Points: {real_summary['key_points']}\n")
    print(f"Formulas: {real_summary['formulas']}\n")
    assert "Newton" in real_summary["summary_text"] or "Physics" in real_summary["summary_text"], "Should summarize actual lecture topics"
    assert len(real_summary["key_points"]) > 0, "Should generate key points"

    print("ALL TESTS PASSED SUCCESSFULLY! ✅")


if __name__ == "__main__":
    test_ai_qa_general_questions()
    test_ai_qa_lecture_grounded()
    test_lecture_summary()
