from typing import Optional, List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.auth.dependencies import get_current_user, require_teacher, require_student
from app.models.entities.user import User
from app.models.entities.academic import Section, Subject, TimetableSlot
from app.models.entities.classroom import Classroom
from app.models.entities.assignments import Assignment, AssignmentSubmission, StudyMaterial
from app.models.entities.teacher import Teacher
from app.models.entities.student import Student

router = APIRouter(prefix="/academics", tags=["Academics & Content"])


# ==========================================
# Timetable CRUD
# ==========================================

@router.get("/timetable/today")
def get_today_timetable(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    today_name = datetime.utcnow().strftime("%A")
    slots = db.query(TimetableSlot).order_by(TimetableSlot.id.asc()).all()

    if not slots:
        # Seed initial database timetable slots
        default_slots = [
            TimetableSlot(
                time_slot="09:00 AM - 10:00 AM",
                subject_code="CSE301",
                subject_name="Artificial Intelligence & Machine Learning",
                topic="Neural Networks & Deep Learning",
                section="Sec-A",
                teacher_name="Dr. Alan Turing",
                classroom_name="Smart Hall 101",
                classroom_id=1,
                day=today_name,
            ),
            TimetableSlot(
                time_slot="11:00 AM - 12:00 PM",
                subject_code="CSE304",
                subject_name="Computer Networks & Accessibility Tech",
                topic="TCP/IP Model & RTSP Streaming",
                section="Sec-A",
                teacher_name="Prof. Ada Lovelace",
                classroom_name="Lab 202",
                classroom_id=2,
                day=today_name,
            ),
        ]
        for ds in default_slots:
            db.add(ds)
        db.commit()
        slots = db.query(TimetableSlot).order_by(TimetableSlot.id.asc()).all()

    return [
        {
            "id": s.id,
            "time": s.time_slot,
            "subject_code": s.subject_code,
            "subject_name": s.subject_name,
            "topic": s.topic or "General Lecture",
            "section": s.section or "Sec-A",
            "teacher_name": s.teacher_name or (current_user.full_name if current_user.role == "teacher" else "Prof. Smith"),
            "classroom": s.classroom_name or "Classroom 101",
            "classroom_id": s.classroom_id or 1,
            "day": s.day or today_name,
        }
        for s in slots
    ]


@router.post("/timetable")
def create_timetable_slot(
    payload: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Teacher creates a new upcoming timetable class slot."""
    if current_user.role != "teacher" and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only faculty teachers can create timetable slots.")

    time_slot = payload.get("time_slot") or payload.get("time")
    subject_name = payload.get("subject_name")
    if not time_slot or not subject_name:
        raise HTTPException(status_code=400, detail="Time slot and subject name are required.")

    slot = TimetableSlot(
        time_slot=time_slot,
        subject_name=subject_name,
        subject_code=payload.get("subject_code", "SUB101"),
        topic=payload.get("topic", "Lecture Topic"),
        section=payload.get("section", "Sec-A"),
        teacher_name=current_user.full_name,
        teacher_id=current_user.teacher.id if hasattr(current_user, "teacher") and current_user.teacher else None,
        classroom_name=payload.get("classroom", "Smart Room 101"),
        classroom_id=payload.get("classroom_id", 1),
        day=payload.get("day", datetime.utcnow().strftime("%A")),
    )
    db.add(slot)
    db.commit()
    db.refresh(slot)

    return {
        "success": True,
        "message": "Timetable class slot created successfully.",
        "slot": {
            "id": slot.id,
            "time": slot.time_slot,
            "subject_code": slot.subject_code,
            "subject_name": slot.subject_name,
            "topic": slot.topic,
            "section": slot.section,
            "teacher_name": slot.teacher_name,
            "classroom": slot.classroom_name,
            "classroom_id": slot.classroom_id,
            "day": slot.day,
        },
    }


@router.put("/timetable/{slot_id}")
def update_timetable_slot(
    slot_id: int,
    payload: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Teacher edits an existing upcoming class slot time, subject, topic, or room."""
    if current_user.role != "teacher" and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only faculty teachers can edit timetable slots.")

    slot = db.query(TimetableSlot).filter(TimetableSlot.id == slot_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Timetable slot not found.")

    if "time" in payload or "time_slot" in payload:
        slot.time_slot = payload.get("time") or payload.get("time_slot")
    if "subject_name" in payload:
        slot.subject_name = payload["subject_name"]
    if "subject_code" in payload:
        slot.subject_code = payload["subject_code"]
    if "topic" in payload:
        slot.topic = payload["topic"]
    if "section" in payload:
        slot.section = payload["section"]
    if "classroom" in payload:
        slot.classroom_name = payload["classroom"]
    if "classroom_id" in payload:
        slot.classroom_id = payload["classroom_id"]
    if "day" in payload:
        slot.day = payload["day"]

    db.commit()
    db.refresh(slot)

    return {
        "success": True,
        "message": "Upcoming class timetable slot updated successfully.",
        "slot": {
            "id": slot.id,
            "time": slot.time_slot,
            "subject_code": slot.subject_code,
            "subject_name": slot.subject_name,
            "topic": slot.topic,
            "section": slot.section,
            "teacher_name": slot.teacher_name,
            "classroom": slot.classroom_name,
            "classroom_id": slot.classroom_id,
            "day": slot.day,
        },
    }


@router.delete("/timetable/{slot_id}")
def delete_timetable_slot(
    slot_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Teacher deletes a canceled class slot from the timetable."""
    if current_user.role != "teacher" and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only faculty teachers can delete timetable slots.")

    slot = db.query(TimetableSlot).filter(TimetableSlot.id == slot_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Timetable slot not found.")

    db.delete(slot)
    db.commit()
    return {"success": True, "message": "Class slot removed from timetable."}


# ==========================================
# Assignments & Submissions
# ==========================================

@router.get("/assignments")
def list_assignments(subject_id: Optional[int] = None, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    query = db.query(Assignment)
    if subject_id:
        query = query.filter(Assignment.subject_id == subject_id)
    if current_user.role == "teacher" and current_user.teacher:
        query = query.filter(Assignment.teacher_id == current_user.teacher.id)

    assignments = query.order_by(Assignment.created_at.desc()).all()
    return [
        {
            "id": a.id,
            "title": a.title,
            "description": a.description,
            "subject_id": a.subject_id,
            "due_date": a.due_date,
            "max_marks": a.max_marks,
            "file_path": a.file_path,
            "teacher_name": a.teacher.name if a.teacher else "Instructor",
            "submissions_count": len(a.submissions),
        }
        for a in assignments
    ]


@router.post("/assignments")
def create_assignment(
    title: str = Form(...),
    description: str = Form(""),
    subject_id: int = Form(...),
    due_date: str = Form(...),
    max_marks: float = Form(100.0),
    file: Optional[UploadFile] = File(None),
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    if not current_user.teacher:
        raise HTTPException(status_code=400, detail="Teacher profile not found")

    file_path = None
    if file:
        file_path = f"uploads/assignments/{file.filename}"

    assignment = Assignment(
        teacher_id=current_user.teacher.id,
        subject_id=subject_id,
        title=title,
        description=description,
        due_date=datetime.fromisoformat(due_date.replace("Z", "+00:00")),
        max_marks=max_marks,
        file_path=file_path,
    )
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return assignment


@router.post("/assignments/{assignment_id}/submit")
def submit_assignment(
    assignment_id: int,
    submission_text: str = Form(""),
    file: Optional[UploadFile] = File(None),
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db),
):
    if not current_user.student:
        raise HTTPException(status_code=400, detail="Student profile not found")

    file_path = None
    if file:
        file_path = f"uploads/submissions/{file.filename}"

    submission = db.query(AssignmentSubmission).filter(
        AssignmentSubmission.assignment_id == assignment_id,
        AssignmentSubmission.student_id == current_user.student.id,
    ).first()

    if not submission:
        submission = AssignmentSubmission(
            assignment_id=assignment_id,
            student_id=current_user.student.id,
            submission_text=submission_text,
            file_path=file_path,
        )
        db.add(submission)
    else:
        submission.submission_text = submission_text
        if file_path:
            submission.file_path = file_path
        submission.submitted_at = datetime.utcnow()

    db.commit()
    return {"message": "Assignment submitted successfully"}


# ==========================================
# Study Materials
# ==========================================

@router.get("/study-materials")
def list_study_materials(subject_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(StudyMaterial)
    if subject_id:
        query = query.filter(StudyMaterial.subject_id == subject_id)
    materials = query.order_by(StudyMaterial.created_at.desc()).all()
    return [
        {
            "id": m.id,
            "title": m.title,
            "description": m.description,
            "file_path": m.file_path,
            "file_type": m.file_type,
            "language": m.language,
            "teacher_name": m.teacher.name if m.teacher else "Instructor",
            "created_at": m.created_at,
        }
        for m in materials
    ]


@router.post("/study-materials")
def upload_study_material(
    title: str = Form(...),
    description: str = Form(""),
    subject_id: int = Form(...),
    file_type: str = Form("pdf"),
    language: str = Form("en"),
    file: UploadFile = File(...),
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    if not current_user.teacher:
        raise HTTPException(status_code=400, detail="Teacher profile not found")

    file_path = f"uploads/materials/{file.filename}"

    sm = StudyMaterial(
        teacher_id=current_user.teacher.id,
        subject_id=subject_id,
        title=title,
        description=description,
        file_path=file_path,
        file_type=file_type,
        language=language,
    )
    db.add(sm)
    db.commit()
    db.refresh(sm)
    return sm
