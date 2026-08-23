import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import unittest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

TEST_DB_FILE = "./test_e2e_classably.db"
test_engine = create_engine(f"sqlite:///{TEST_DB_FILE}", connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

from app.main import app
from app.core.database import Base, get_db


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


class E2EClassroomFlowTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.drop_all(bind=test_engine)
        Base.metadata.create_all(bind=test_engine)

    @classmethod
    def tearDownClass(cls):
        app.dependency_overrides.clear()
        Base.metadata.drop_all(bind=test_engine)
        test_engine.dispose()
        if os.path.exists(TEST_DB_FILE):
            try:
                os.remove(TEST_DB_FILE)
            except Exception:
                pass

    def setUp(self):
        app.dependency_overrides[get_db] = override_get_db
        self.client = TestClient(app)

        # Register Admin
        admin_res = self.client.post(
            "/api/auth/register",
            json={
                "email": "admin@university.edu",
                "password": "AdminPassword123!",
                "full_name": "System Administrator",
                "role": "admin",
            },
        )
        self.admin_token = admin_res.json()["access_token"]
        self.admin_headers = {"Authorization": f"Bearer {self.admin_token}"}

        # Register Teacher
        teacher_res = self.client.post(
            "/api/auth/register",
            json={
                "email": "prof.smith@university.edu",
                "password": "SecurePass123!",
                "full_name": "Prof. Smith",
                "role": "teacher",
                "employee_id": "EMP-101",
            },
        )
        self.teacher_token = teacher_res.json()["access_token"]
        self.teacher_headers = {"Authorization": f"Bearer {self.teacher_token}"}

        # Register Student
        student_res = self.client.post(
            "/api/auth/register",
            json={
                "email": "alex.student@university.edu",
                "password": "SecurePass123!",
                "full_name": "Alex Student",
                "role": "student",
                "roll_number": "STU-2026-001",
                "disability_profiles": ["hearing", "low_vision"],
            },
        )
        self.student_token = student_res.json()["access_token"]
        self.student_headers = {"Authorization": f"Bearer {self.student_token}"}

    def tearDown(self):
        app.dependency_overrides.clear()

    def test_full_classroom_lifecycle(self):
        # 1. Admin creates Department & Classroom
        dept_res = self.client.post(
            "/admin/departments",
            json={"code": "CS", "name": "Computer Science & Engineering"},
            headers=self.admin_headers,
        )
        self.assertIn(dept_res.status_code, [200, 201])

        room_res = self.client.post(
            "/api/classrooms",
            json={"name": "Smart Classroom 101", "building": "Tech Block", "floor": 1},
            headers=self.admin_headers,
        )
        self.assertEqual(room_res.status_code, 200)
        classroom_id = room_res.json()["id"]

        # 2. Seed & Test Smart Devices
        seed_res = self.client.post(f"/api/devices/seed/{classroom_id}")
        self.assertEqual(seed_res.status_code, 200)

        devices_res = self.client.get(f"/api/devices?classroom_id={classroom_id}")
        self.assertEqual(devices_res.status_code, 200)
        self.assertGreater(len(devices_res.json()), 0)

        # 3. Teacher Starts Lecture Session
        start_session_res = self.client.post(
            f"/api/lecture-session/start?classroom_id={classroom_id}&teacher_id=1&subject=Deep%20Learning&topic=CNNs",
            headers=self.teacher_headers,
        )
        self.assertEqual(start_session_res.status_code, 200)
        session_id = start_session_res.json()["session"]["id"]

        # 4. Speech Subtitle Ingestion & Live Subtitle Retrieval
        sub_res = self.client.post(
            "/api/lecture-session/subtitles/ingest",
            json={
                "session_id": session_id,
                "text": "Today we will analyze how convolutional filters extract feature maps from image tensors.",
                "speaker_name": "Prof. Smith",
                "target_lang": "es",
            },
            headers=self.teacher_headers,
        )
        self.assertEqual(sub_res.status_code, 200)

        get_sub_res = self.client.get(f"/api/lecture-session/subtitles/{session_id}?target_lang=es")
        self.assertEqual(get_sub_res.status_code, 200)
        self.assertGreater(len(get_sub_res.json()), 0)

        # 5. Student Raises Hand with Question
        rh_res = self.client.post(
            "/api/lecture-session/raise-hand",
            json={"session_id": session_id, "question_text": "Could you explain padding and stride effects?"},
            headers=self.student_headers,
        )
        self.assertEqual(rh_res.status_code, 200)

        # 6. Teacher Resolves Hand Raise
        rh_list = self.client.get(f"/api/lecture-session/raise-hand/{session_id}", headers=self.teacher_headers)
        self.assertEqual(rh_list.status_code, 200)
        if rh_list.json():
            rh_id = rh_list.json()[0]["id"]
            self.client.post(f"/api/lecture-session/raise-hand/{rh_id}/resolve", headers=self.teacher_headers)

        # 7. AI Quiz Question Generation
        quiz_res = self.client.post(f"/api/lecture-session/generate-quiz/{session_id}", headers=self.teacher_headers)
        self.assertEqual(quiz_res.status_code, 200)

        # 8. Teacher Ends Session
        end_res = self.client.post(f"/api/lecture-session/end/{session_id}", headers=self.teacher_headers)
        self.assertEqual(end_res.status_code, 200)
        self.assertEqual(end_res.json()["session"]["status"], "ENDED")


if __name__ == "__main__":
    unittest.main()
