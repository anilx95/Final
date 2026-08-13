import os
import unittest
from types import SimpleNamespace

os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("SECRET_KEY", "test-secret")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")

from app.schemas.teacher import TeacherCreate
from app.services.teacher_service import add_teacher


class FakeSession:
    def __init__(self):
        self.teachers = []

    def query(self, model):
        return self

    def filter(self, *args, **kwargs):
        return self

    def first(self):
        return self.teachers[0] if self.teachers else None

    def all(self):
        return list(self.teachers)

    def add(self, teacher):
        self.teachers.append(teacher)

    def commit(self):
        return None

    def refresh(self, teacher):
        return None


class TeacherServiceTests(unittest.TestCase):
    def test_add_teacher_requires_non_empty_name(self):
        data = TeacherCreate(
            name="   ",
            employee_id="EMP-001",
            email="teacher@example.com",
            department="CSE",
            designation="Assistant Professor",
        )

        with self.assertRaises(ValueError):
            add_teacher(FakeSession(), data)

    def test_add_teacher_rejects_duplicate_email(self):
        session = FakeSession()
        session.teachers.append(SimpleNamespace(email="same@example.com", employee_id="EMP-001"))

        first = TeacherCreate(
            name="Alice Smith",
            employee_id="EMP-001",
            email="same@example.com",
            department="CSE",
            designation="Assistant Professor",
        )

        with self.assertRaises(ValueError):
            add_teacher(session, first)


if __name__ == "__main__":
    unittest.main()
