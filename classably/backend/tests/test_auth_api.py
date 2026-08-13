import os
import unittest
from fastapi.testclient import TestClient

TEST_DB_FILE = "./test_classably.db"
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB_FILE}"
os.environ["SECRET_KEY"] = "test-secret-key-12345"
os.environ["REDIS_URL"] = "redis://localhost:6379/0"

from app.main import app
from app.core.database import Base, engine, get_db
from sqlalchemy.orm import sessionmaker

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


class AuthApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)

    @classmethod
    def tearDownClass(cls):
        Base.metadata.drop_all(bind=engine)
        engine.dispose()
        if os.path.exists(TEST_DB_FILE):
            try:
                os.remove(TEST_DB_FILE)
            except Exception:
                pass

    def setUp(self):
        self.client = TestClient(app)

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
