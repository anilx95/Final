from sqlalchemy.orm import Session

from app.models.models import Teacher
from app.repositories.teacher_repository import (
    create_teacher,
    delete_teacher,
    get_teacher,
    get_teacher_by_email,
    get_teacher_by_employee_id,
    get_teachers,
    update_teacher,
)


def list_teachers(db: Session) -> list[Teacher]:
    return get_teachers(db)


def get_teacher_details(db: Session, teacher_id: int) -> Teacher | None:
    return get_teacher(db, teacher_id)


def add_teacher(db: Session, data) -> Teacher:
    name = (data.name or "").strip()
    employee_id = (data.employee_id or "").strip()
    email = (data.email or "").strip().lower()

    if not name:
        raise ValueError("Teacher name is required")

    if not employee_id:
        raise ValueError("Employee ID is required")

    if not email:
        raise ValueError("Email is required")

    if get_teacher_by_employee_id(db, employee_id):
        raise ValueError("Employee ID already exists")

    if get_teacher_by_email(db, email):
        raise ValueError("Email already exists")

    payload = data.model_dump(exclude_none=True)
    payload.update({
        "name": name,
        "employee_id": employee_id,
        "email": email,
    })

    teacher = Teacher(**payload)

    return create_teacher(db, teacher)


def remove_teacher(db: Session, teacher_id: int) -> Teacher | None:
    teacher = get_teacher(db, teacher_id)

    if teacher is None:
        return None

    delete_teacher(db, teacher)
    return teacher


def edit_teacher(db: Session, teacher_id: int, data):
    teacher = get_teacher(db, teacher_id)

    if teacher is None:
        return None

    update_payload = data.model_dump(exclude_unset=True)

    if "employee_id" in update_payload and update_payload["employee_id"]:
        candidate_employee_id = str(update_payload["employee_id"]).strip()
        if candidate_employee_id != teacher.employee_id:
            if get_teacher_by_employee_id(db, candidate_employee_id):
                raise ValueError("Employee ID already exists")
            update_payload["employee_id"] = candidate_employee_id

    if "email" in update_payload and update_payload["email"]:
        candidate_email = str(update_payload["email"]).strip().lower()
        if candidate_email != teacher.email:
            if get_teacher_by_email(db, candidate_email):
                raise ValueError("Email already exists")
            update_payload["email"] = candidate_email

    if "name" in update_payload and update_payload["name"]:
        update_payload["name"] = str(update_payload["name"]).strip()

    return update_teacher(db, teacher, update_payload)