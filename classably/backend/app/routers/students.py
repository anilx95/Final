from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.auth.dependencies import require_admin

from app.schemas.student import (
    StudentCreate,
    StudentUpdate,
)
from app.services.student_service import (
    list_students,
    add_student,
    remove_student,
    edit_student,
    get_student_details,
    get_classroom_students,
    get_student_statistics,
)

router = APIRouter(
    prefix="/api/students",
    tags=["Students"],
)


@router.get("")
def all_students(
    db: Session = Depends(get_db),
):
    return list_students(db)


@router.get("/{student_id}")
def student_details(
    student_id: int,
    db: Session = Depends(get_db),
):
    student = get_student_details(
        db,
        student_id,
    )

    if student is None:
        raise HTTPException(
            status_code=404,
            detail="Student not found",
        )

    return student


@router.get("/classroom/{classroom_id}")
def classroom_students(
    classroom_id: int,
    db: Session = Depends(get_db),
):
    return get_classroom_students(
        db,
        classroom_id,
    )


@router.get("/statistics")
def student_statistics(
    db: Session = Depends(get_db),
):
    return get_student_statistics(db)


@router.post("")
def create_student(
    student: StudentCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    try:
        return add_student(
            db,
            student,
        )

    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e),
        )


@router.put("/{student_id}")
def update_student(
    student_id: int,
    student: StudentUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    try:
        updated_student = edit_student(
            db,
            student_id,
            student,
        )

        if updated_student is None:
            raise HTTPException(
                status_code=404,
                detail="Student not found",
            )

        return updated_student

    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e),
        )


@router.delete("/{student_id}")
def delete_student(
    student_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    student = remove_student(
        db,
        student_id,
    )

    if student is None:
        raise HTTPException(
            status_code=404,
            detail="Student not found",
        )

    return {
        "message": "Student deleted successfully"
    }