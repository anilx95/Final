from sqlalchemy.orm import Session

from app.models.models import Classroom
from app.repositories.classroom_repository import (
    create_classroom,
    get_all_classrooms,
    get_classroom_by_id,
    delete_classroom,
)


def list_classrooms(db: Session):
    return get_all_classrooms(db)


def create_new_classroom(
    db: Session,
    name: str,
    building: str,
    floor: int,
    pos_x: float,
    pos_y: float,
    has_step_access_only: bool,
):
    classroom = Classroom(
        name=name,
        building=building,
        floor=floor,
        pos_x=pos_x,
        pos_y=pos_y,
        has_step_access_only=has_step_access_only,
    )

    return create_classroom(db, classroom)


def remove_classroom(
    db: Session,
    classroom_id: int,
):
    classroom = get_classroom_by_id(
        db,
        classroom_id,
    )

    if classroom is None:
        return None

    delete_classroom(db, classroom)

    return classroom