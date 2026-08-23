import os
import unittest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

TEST_DB_FILE = "./test_classably.db"
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


class AuthApiTests(unittest.TestCase):
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

    def tearDown(self):
        app.dependency_overrides.clear()

    def test_root_endpoint(self):
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        self.assertIn("ClassAbly Platform API Operational", response.json()["message"])

    def test_user_registration_and_login(self):
        reg_payload = {
            "email": "teacher1@example.com",
            "password": "Password123!",
            "full_name": "Dr. Sarah Connor",
            "role": "teacher",
            "employee_id": "EMP-9001",
            "phone": "+1234567890",
        }
        res_reg = self.client.post("/api/auth/register", json=reg_payload)
        self.assertEqual(res_reg.status_code, 200)
        data = res_reg.json()
        self.assertIn("access_token", data)
        self.assertEqual(data["user"]["email"], "teacher1@example.com")

        login_payload = {
            "email": "teacher1@example.com",
            "password": "Password123!",
        }
        res_login = self.client.post("/api/auth/login", json=login_payload)
        self.assertEqual(res_login.status_code, 200)
        token = res_login.json()["access_token"]

        headers = {"Authorization": f"Bearer {token}"}
        res_me = self.client.get("/api/auth/me", headers=headers)
        self.assertEqual(res_me.status_code, 200)
        self.assertEqual(res_me.json()["full_name"], "Dr. Sarah Connor")


if __name__ == "__main__":
    unittest.main()
