from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.models.models import Classroom


def get_all_classrooms(db: Session):
    return db.query(Classroom).all()


def get_classroom_by_id(
    db: Session,
    classroom_id: int,
):
    return (
        db.query(Classroom)
        .filter(Classroom.id == classroom_id)
        .first()
    )


def get_classroom_by_name(
    db: Session,
    name: str,
):
    return (
        db.query(Classroom)
        .filter(
            func.lower(Classroom.name)
            == name.lower()
        )
        .first()
    )


def search_classrooms(
    db: Session,
    keyword: str,
):
    return (
        db.query(Classroom)
        .filter(
            or_(
                Classroom.name.ilike(f"%{keyword}%"),
                Classroom.location.ilike(f"%{keyword}%"),
            )
        )
        .all()
    )


def create_classroom(
    db: Session,
    classroom: Classroom,
):
    db.add(classroom)
    db.commit()
    db.refresh(classroom)
    return classroom


def update_classroom(
    db: Session,
    classroom: Classroom,
    data,
):
    update_data = data.model_dump(
        exclude_unset=True
    )

    for key, value in update_data.items():
        setattr(
            classroom,
            key,
            value,
        )

    db.commit()
    db.refresh(classroom)

    return classroom


def count_classrooms(
    db: Session,
):
    return db.query(Classroom).count()


def delete_classroom(
    db: Session,
    classroom: Classroom,
):
    db.delete(classroom)
    db.commit()