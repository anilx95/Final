from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db

from app.services.dashboard_service import DashboardService

from app.auth.dependencies import (
    require_admin,
    require_teacher,
)

router = APIRouter(
    prefix="/api/dashboard",
    tags=["Dashboard"],
)


# ======================================================
# Admin Dashboard Overview
# ======================================================

@router.get("/overview")
def dashboard_overview(
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    return DashboardService.get_overview(db)


# ======================================================
# Attendance Analytics
# ======================================================

@router.get("/attendance")
def attendance_dashboard(
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    return DashboardService.get_attendance(db)


# ======================================================
# Voice Analytics
# ======================================================

@router.get("/voice")
def voice_dashboard(
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    return DashboardService.get_voice(db)


# ======================================================
# Device Analytics
# ======================================================

@router.get("/devices")
def device_dashboard(
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    return DashboardService.get_devices(db)


# ======================================================
# Accessibility Analytics
# ======================================================

@router.get("/accessibility")
def accessibility_dashboard(
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    return DashboardService.get_accessibility(db)


# ======================================================
# Classroom Summary
# ======================================================

@router.get("/classrooms")
def classroom_dashboard(
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    return DashboardService.get_classroom_summary(db)


# ======================================================
# Teacher Dashboard
# ======================================================

@router.get("/teacher")
def teacher_dashboard(
    db: Session = Depends(get_db),
    current_user=Depends(require_teacher),
):
    """
    Phase 1:
    Returns the same overview until
    teacher-specific filtering is implemented.
    """
    return DashboardService.get_overview(db)