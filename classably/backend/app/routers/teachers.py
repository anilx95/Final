from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import require_admin
from app.core.database import get_db
from app.schemas.teacher import (
    TeacherCreate,
    TeacherResponse,
    TeacherUpdate,
)
from app.services.teacher_service import (
    add_teacher,
    edit_teacher,
    get_teacher_details,
    list_teachers,
    remove_teacher,
)

router = APIRouter(
    prefix="/api/teachers",
    tags=["Teachers"],
)


@router.get("", response_model=list[TeacherResponse])
def all_teachers(
    db: Session = Depends(get_db),
):
    return list_teachers(db)


@router.get("/{teacher_id}", response_model=TeacherResponse)
def get_teacher_by_id(
    teacher_id: int,
    db: Session = Depends(get_db),
):
    teacher = get_teacher_details(db, teacher_id)

    if teacher is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Teacher not found",
        )

    return teacher


@router.post("", response_model=TeacherResponse, status_code=status.HTTP_201_CREATED)
def create_teacher(
    teacher: TeacherCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    try:
        return add_teacher(
            db,
            teacher,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.put("/{teacher_id}", response_model=TeacherResponse)
def update_teacher(
    teacher_id: int,
    teacher: TeacherUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    try:
        updated_teacher = edit_teacher(
            db,
            teacher_id,
            teacher,
        )

        if updated_teacher is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Teacher not found",
            )

        return updated_teacher

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.delete("/{teacher_id}")
def delete_teacher(
    teacher_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    teacher = remove_teacher(
        db,
        teacher_id,
    )

    if teacher is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Teacher not found",
        )

    return {
        "message": "Teacher deleted"
    }