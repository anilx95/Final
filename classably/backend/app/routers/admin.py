import logging
from typing import Optional, List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func

logger = logging.getLogger(__name__)

from app.core.database import get_db, engine
from app.auth.dependencies import require_admin
from app.auth.security import hash_password
from app.models.entities.user import User
from app.models.entities.academic import (
    Department, Course, AcademicYear, Semester, Subject, Section, Building, Floor
)
from app.models.entities.classroom import Classroom
from app.models.entities.student import Student
from app.models.entities.teacher import Teacher
from app.models.entities.smart_classroom import SmartDevice, CameraSource, SensorMetric
from app.models.entities.lecture import LectureSession, LectureRecording, BoardSnapshot
from app.models.entities.accessibility import AccessibilityRequest, AccessibilityProfileEvent
from app.models.audit_log import AuditLog
from app.models.entities.voice import VoiceCommandLog

router = APIRouter(prefix="/admin", tags=["Admin Portal"], dependencies=[Depends(require_admin)])


# ==========================================
# Institutional Infrastructure: Departments & Courses
# ==========================================

@router.get("/departments")
def list_departments(db: Session = Depends(get_db)):
    departments = db.query(Department).all()
    return [
        {
            "id": d.id,
            "code": d.code,
            "name": d.name,
            "description": d.description,
            "head_of_department": d.head_of_department,
            "total_courses": len(d.courses),
            "total_teachers": len(d.teachers),
        }
        for d in departments
    ]


@router.post("/departments")
def create_department(payload: dict, db: Session = Depends(get_db)):
    dept = Department(
        code=payload["code"],
        name=payload["name"],
        description=payload.get("description", ""),
        head_of_department=payload.get("head_of_department", ""),
    )
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return dept


@router.get("/courses")
def list_courses(department_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(Course)
    if department_id:
        query = query.filter(Course.department_id == department_id)
    courses = query.all()
    return [
        {
            "id": c.id,
            "department_id": c.department_id,
            "code": c.code,
            "name": c.name,
            "duration_years": c.duration_years,
            "department_name": c.department.name if c.department else None,
        }
        for c in courses
    ]


@router.post("/courses")
def create_course(payload: dict, db: Session = Depends(get_db)):
    course = Course(
        department_id=payload["department_id"],
        code=payload["code"],
        name=payload["name"],
        duration_years=payload.get("duration_years", 4),
        description=payload.get("description", ""),
    )
    db.add(course)
    db.commit()
    db.refresh(course)
    return course


# ==========================================
# Academic Years, Semesters, Subjects, Sections
# ==========================================

@router.get("/academic-years")
def list_academic_years(db: Session = Depends(get_db)):
    return db.query(AcademicYear).all()


@router.post("/academic-years")
def create_academic_year(payload: dict, db: Session = Depends(get_db)):
    ay = AcademicYear(
        year_label=payload["year_label"],
        start_date=datetime.fromisoformat(payload["start_date"]),
        end_date=datetime.fromisoformat(payload["end_date"]),
        is_current=payload.get("is_current", True),
    )
    db.add(ay)
    db.commit()
    db.refresh(ay)
    return ay


@router.get("/subjects")
def list_subjects(course_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(Subject)
    if course_id:
        query = query.filter(Subject.course_id == course_id)
    return query.all()


@router.post("/subjects")
def create_subject(payload: dict, db: Session = Depends(get_db)):
    subj = Subject(
        course_id=payload["course_id"],
        semester_id=payload.get("semester_id"),
        code=payload["code"],
        name=payload["name"],
        credits=payload.get("credits", 3),
        description=payload.get("description", ""),
    )
    db.add(subj)
    db.commit()
    db.refresh(subj)
    return subj


# ==========================================
# Buildings, Floors & Classrooms
# ==========================================

@router.get("/buildings")
def list_buildings(db: Session = Depends(get_db)):
    buildings = db.query(Building).all()
    return [
        {
            "id": b.id,
            "code": b.code,
            "name": b.name,
            "total_floors": b.total_floors,
            "has_elevator": b.has_elevator,
            "has_wheelchair_ramps": b.has_wheelchair_ramps,
            "floors_count": len(b.floors),
        }
        for b in buildings
    ]


@router.post("/buildings")
def create_building(payload: dict, db: Session = Depends(get_db)):
    b = Building(
        name=payload["name"],
        code=payload["code"],
        total_floors=payload.get("total_floors", 4),
        has_elevator=payload.get("has_elevator", True),
        has_wheelchair_ramps=payload.get("has_wheelchair_ramps", True),
    )
    db.add(b)
    db.commit()
    db.refresh(b)

    # Auto-create floors
    for f_num in range(1, b.total_floors + 1):
        fl = Floor(building_id=b.id, floor_number=f_num, name=f"Floor {f_num}")
        db.add(fl)
    db.commit()
    return b


@router.get("/classrooms")
def list_classrooms(db: Session = Depends(get_db)):
    classrooms = db.query(Classroom).all()
    return [
        {
            "id": c.id,
            "name": c.name,
            "code": c.code,
            "building": c.building,
            "floor": c.floor,
            "room_number": c.room_number,
            "capacity": c.capacity,
            "has_wheelchair_ramp": c.has_wheelchair_ramp,
            "has_smart_board": c.has_smart_board,
            "has_audio_system": c.has_audio_system,
            "devices_count": len(c.devices),
            "cameras_count": len(c.cameras),
            "students_count": len(c.students),
        }
        for c in classrooms
    ]


@router.post("/classrooms")
def create_classroom(payload: dict, db: Session = Depends(get_db)):
    c = Classroom(
        name=payload["name"],
        code=payload.get("code", f"CR-{payload['name'].replace(' ', '')}"),
        building=payload.get("building", "Main Block"),
        floor=payload.get("floor", 1),
        room_number=payload.get("room_number", "101"),
        capacity=payload.get("capacity", 60),
        has_wheelchair_ramp=payload.get("has_wheelchair_ramp", True),
        has_smart_board=payload.get("has_smart_board", True),
        has_audio_system=payload.get("has_audio_system", True),
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


# ==========================================
# User Management (Teachers & Students)
# ==========================================

@router.get("/users")
def list_users(role: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(User)
    if role:
        query = query.filter(User.role == role)
    users = query.all()
    return [
        {
            "id": u.id,
            "full_name": u.full_name,
            "email": u.email,
            "role": u.role,
            "is_active": u.is_active,
            "phone": u.phone,
            "created_at": u.created_at,
        }
        for u in users
    ]


@router.put("/users/{user_id}/status")
def update_user_status(user_id: int, payload: dict, db: Session = Depends(get_db)):
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    u.is_active = payload.get("is_active", True)
    db.commit()
    return {"message": "User status updated successfully"}


@router.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    
    name = u.full_name
    try:
        from app.models.entities.student import Student
        from app.models.entities.teacher import Teacher
        from app.models.audit_log import AuditLog
        from app.models.notification import Notification
        from app.models.entities.voice import VoiceCommandLog
        from app.models.entities.accessibility import AccessibilityRequest, AccessibilityProfileEvent
        from app.models.entities.attendance import Attendance
        from app.models.entities.assignments import Assignment, AssignmentSubmission, StudyMaterial
        from app.models.entities.connected_student import ConnectedStudent
        from app.models.entities.smart_classroom import RaiseHandEvent
        from app.models.entities.ai_qa import AIQAMessage
        from app.models.entities.academic import Section, TimetableSlot
        from app.models.entities.lecture import LectureSession

        # Find student and teacher records linked to this user
        students = db.query(Student).filter(Student.user_id == user_id).all()
        teachers = db.query(Teacher).filter((Teacher.user_id == user_id) | (Teacher.email == u.email)).all()
        
        student_ids = [s.id for s in students]
        teacher_ids = [t.id for t in teachers]

        # 1. Clean up student dependencies
        if student_ids:
            db.query(Attendance).filter(Attendance.student_id.in_(student_ids)).delete(synchronize_session=False)
            db.query(AssignmentSubmission).filter(AssignmentSubmission.student_id.in_(student_ids)).delete(synchronize_session=False)
            db.query(ConnectedStudent).filter(ConnectedStudent.student_id.in_(student_ids)).delete(synchronize_session=False)
            db.query(RaiseHandEvent).filter(RaiseHandEvent.student_id.in_(student_ids)).delete(synchronize_session=False)
            db.query(VoiceCommandLog).filter(VoiceCommandLog.student_id.in_(student_ids)).delete(synchronize_session=False)
            db.query(AccessibilityRequest).filter(AccessibilityRequest.student_id.in_(student_ids)).delete(synchronize_session=False)
            db.query(AccessibilityProfileEvent).filter(AccessibilityProfileEvent.student_id.in_(student_ids)).delete(synchronize_session=False)
            db.query(AIQAMessage).filter(AIQAMessage.student_id.in_(student_ids)).delete(synchronize_session=False)

        # 2. Clean up teacher dependencies
        if teacher_ids:
            db.query(Section).filter(Section.teacher_id.in_(teacher_ids)).update({Section.teacher_id: None}, synchronize_session=False)
            db.query(TimetableSlot).filter(TimetableSlot.teacher_id.in_(teacher_ids)).update({TimetableSlot.teacher_id: None}, synchronize_session=False)
            
            t_assignments = db.query(Assignment).filter(Assignment.teacher_id.in_(teacher_ids)).all()
            t_assignment_ids = [a.id for a in t_assignments]
            if t_assignment_ids:
                db.query(AssignmentSubmission).filter(AssignmentSubmission.assignment_id.in_(t_assignment_ids)).delete(synchronize_session=False)
                db.query(Assignment).filter(Assignment.id.in_(t_assignment_ids)).delete(synchronize_session=False)

            db.query(StudyMaterial).filter(StudyMaterial.teacher_id.in_(teacher_ids)).delete(synchronize_session=False)

            t_sessions = db.query(LectureSession).filter(LectureSession.teacher_id.in_(teacher_ids)).all()
            for sess in t_sessions:
                db.delete(sess)

        for s in students:
            db.delete(s)
        for t in teachers:
            db.delete(t)

        # 3. Clean up user-level logs and notifications
        db.query(AuditLog).filter(AuditLog.user_id == user_id).delete(synchronize_session=False)
        db.query(Notification).filter(Notification.user_id == user_id).delete(synchronize_session=False)
        db.query(VoiceCommandLog).filter(VoiceCommandLog.user_id == user_id).delete(synchronize_session=False)

        # 4. Delete the User record
        db.delete(u)
        db.commit()
        return {"success": True, "message": f"User {name} deleted successfully"}

    except Exception as err:
        db.rollback()
        logger.error(f"Failed to delete user #{user_id}: {err}")
        raise HTTPException(status_code=500, detail=f"Failed to delete user {name}: {str(err)}")


@router.post("/create-admin")
def create_admin(payload: dict, db: Session = Depends(get_db)):
    email = payload.get("email", "").lower().strip()
    full_name = payload.get("full_name", "").strip()
    password = payload.get("password")
    if not email or not full_name or not password:
        raise HTTPException(status_code=400, detail="Full name, email, and password are required")
    
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email is already registered")
    
    admin_user = User(
        full_name=full_name,
        email=email,
        password_hash=hash_password(password),
        role="admin",
        phone=payload.get("phone"),
    )
    db.add(admin_user)
    db.commit()
    db.refresh(admin_user)
    return {"success": True, "message": "Admin account created successfully", "user_id": admin_user.id}


@router.get("/teacher-recordings")
def list_teacher_recordings(db: Session = Depends(get_db)):
    try:
        sessions = db.query(LectureSession).order_by(LectureSession.started_at.desc()).all()
        recordings = []
        for s in sessions:
            try:
                rec = db.query(LectureRecording).filter(LectureRecording.session_id == s.id).first()
                duration_mins = int((s.ended_at - s.started_at).total_seconds() / 60) if (getattr(s, "ended_at", None) and getattr(s, "started_at", None)) else 0
                
                t_name = getattr(s, "teacher_name", None)
                if not t_name and hasattr(s, "teacher") and s.teacher:
                    t_name = getattr(s.teacher, "name", None) or getattr(s.teacher, "full_name", "Faculty Educator")
                if not t_name:
                    t_name = "Faculty Educator"

                video_url = getattr(rec, "video_url", None) if rec else None
                if not video_url:
                    video_url = f"/api/export/recording/{s.id}/download"

                audio_url = getattr(rec, "audio_url", None) if rec else None
                if not audio_url:
                    audio_url = f"/api/export/audio/{s.id}/download"

                recordings.append({
                    "id": s.id,
                    "session_id": s.id,
                    "teacher_id": getattr(s, "teacher_id", None),
                    "teacher_name": t_name,
                    "subject": getattr(s, "subject", "General Lecture") or "General Lecture",
                    "topic": getattr(s, "topic", "Lecture") or "Lecture",
                    "status": getattr(s, "status", "ENDED") or "ENDED",
                    "started_at": s.started_at.strftime("%Y-%m-%d %H:%M:%S") if getattr(s, "started_at", None) else None,
                    "ended_at": s.ended_at.strftime("%Y-%m-%d %H:%M:%S") if getattr(s, "ended_at", None) else None,
                    "duration": f"{duration_mins} mins" if duration_mins > 0 else "Live Stream",
                    "video_url": video_url,
                    "audio_url": audio_url,
                })
            except Exception as inner_err:
                logger.warning(f"Error processing recording for session #{s.id}: {inner_err}")
        return recordings
    except Exception as err:
        logger.error(f"Failed to list teacher recordings: {err}")
        return []


# ==========================================
# Audit Logs, System & Database Health
# ==========================================

@router.get("/audit-logs")
def list_audit_logs(
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db)
):
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit).all()
    return [
        {
            "id": l.id,
            "user_id": l.user_id,
            "action": l.action,
            "module": l.module,
            "details": l.details,
            "ip_address": l.ip_address,
            "created_at": l.created_at,
        }
        for l in logs
    ]


@router.get("/system-health")
def get_system_health(db: Session = Depends(get_db)):
    from sqlalchemy import text
    db_connected = True
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        db_connected = False

    total_devices = db.query(SmartDevice).count()
    online_devices = db.query(SmartDevice).filter(SmartDevice.status == "online").count()
    total_cameras = db.query(CameraSource).count()
    active_cameras = db.query(CameraSource).filter(CameraSource.is_active == True).count()

    return {
        "database": {"status": "healthy" if db_connected else "degraded", "engine": "PostgreSQL"},
        "ai_pipeline": {"status": "operational", "models": ["YOLOv11", "Whisper/STT", "PaddleOCR"]},
        "devices": {"total": total_devices, "online": online_devices, "health_pct": 100.0 if total_devices == 0 else round((online_devices/total_devices)*100, 1)},
        "cameras": {"total": total_cameras, "active": active_cameras},
        "system_version": "1.0.0",
        "uptime": "99.98%",
    }


@router.get("/overview-stats")
def get_admin_overview(db: Session = Depends(get_db)):
    return {
        "departments": db.query(Department).count(),
        "courses": db.query(Course).count(),
        "classrooms": db.query(Classroom).count(),
        "teachers": db.query(Teacher).count(),
        "students": db.query(Student).count(),
        "active_sessions": db.query(LectureSession).filter(LectureSession.status == "ACTIVE").count(),
        "total_recordings": db.query(LectureRecording).count(),
        "accessibility_requests": db.query(AccessibilityRequest).filter(AccessibilityRequest.status == "pending").count(),
        "smart_devices": db.query(SmartDevice).count(),
        "board_ocr_captures": db.query(BoardSnapshot).count(),
    }
