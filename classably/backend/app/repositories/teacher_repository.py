from sqlalchemy.orm import Session

from app.models.models import Teacher


def get_teachers(db: Session) -> list[Teacher]:
    return db.query(Teacher).order_by(Teacher.created_at.desc()).all()


def get_teacher(db: Session, teacher_id: int) -> Teacher | None:
    return (
        db.query(Teacher)
        .filter(Teacher.id == teacher_id)
        .first()
    )


def get_teacher_by_employee_id(
    db: Session,
    employee_id: str,
) -> Teacher | None:
    return (
        db.query(Teacher)
        .filter(
            Teacher.employee_id == employee_id
        )
        .first()
    )


def get_teacher_by_email(
    db: Session,
    email: str,
) -> Teacher | None:
    return (
        db.query(Teacher)
        .filter(Teacher.email == email)
        .first()
    )


def create_teacher(
    db: Session,
    teacher: Teacher,
) -> Teacher:
    db.add(teacher)
    db.commit()
    db.refresh(teacher)
    return teacher


def delete_teacher(
    db: Session,
    teacher: Teacher,
) -> None:
    db.delete(teacher)
    db.commit()


def update_teacher(
    db: Session,
    teacher: Teacher,
    data,
) -> Teacher:
    if hasattr(data, "model_dump"):
        update_data = data.model_dump(exclude_unset=True)
    else:
        update_data = dict(data)

    for key, value in update_data.items():
        setattr(
            teacher,
            key,
            value,
        )

    db.commit()
    db.refresh(teacher)

    return teacher
