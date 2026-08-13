from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.auth.dependencies import require_teacher

from app.schemas.attendance import (
    AttendanceCreate,
    AttendanceResponse,
)

from app.services.attendance_service import (
    mark_attendance,
    list_attendance,
    student_attendance,
    classroom_attendance,
)

router = APIRouter(
    prefix="/api/attendance",
    tags=["Attendance"],
)


@router.post(
    "",
    response_model=AttendanceResponse,
)
def create(
    attendance: AttendanceCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_teacher),
):
    return mark_attendance(
        db=db,
        attendance=attendance,
        current_user=current_user,
    )


@router.get(
    "",
    response_model=list[AttendanceResponse],
)
def all(
    db: Session = Depends(get_db),
):
    return list_attendance(db)


@router.get(
    "/student/{student_id}",
    response_model=list[AttendanceResponse],
)
def student(
    student_id: int,
    db: Session = Depends(get_db),
):
    return student_attendance(
        db,
        student_id,
    )


@router.get(
    "/classroom/{classroom_id}",
    response_model=list[AttendanceResponse],
)
def classroom(
    classroom_id: int,
    db: Session = Depends(get_db),
):
    return classroom_attendance(
        db,
        classroom_id,
    )