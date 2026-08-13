from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth.dependencies import require_admin
from app.core.database import get_db
from app.schemas.classroom import ClassroomCreate
from app.services.classroom_service import (
    list_classrooms,
    create_new_classroom,
    remove_classroom,
)

router = APIRouter(
    prefix="/api/classrooms",
    tags=["Classrooms"],
)


@router.get("")
def get_all(
    db: Session = Depends(get_db),
):
    return list_classrooms(db)


@router.post("")
def create(
    classroom: ClassroomCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    return create_new_classroom(
        db=db,
        **classroom.model_dump()
    )


@router.delete("/{classroom_id}")
def delete(
    classroom_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    classroom = remove_classroom(
        db,
        classroom_id,
    )

    if classroom is None:
        raise HTTPException(
            status_code=404,
            detail="Classroom not found",
        )

    return {"message": "Deleted successfully"}