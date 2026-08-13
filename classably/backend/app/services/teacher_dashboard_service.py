from app.repositories.teacher_dashboard_repository import (
    get_dashboard_summary,
)


def dashboard_summary(
    db,
    teacher_id: int,
):
    dashboard = get_dashboard_summary(
        db,
        teacher_id,
    )

    if dashboard is None:
        return None

    teacher = dashboard["teacher"]
    classroom = dashboard["classroom"]
    active_session = dashboard["active_session"]

    return {
        "teacher": {
            "id": teacher.id,
            "name": teacher.name,
            "employee_id": teacher.employee_id,
            "email": teacher.email,
            "phone": teacher.phone,
            "department": teacher.department,
            "designation": teacher.designation,
        },
        "classroom": (
            {
                "id": classroom.id,
                "name": classroom.name,
            }
            if classroom
            else None
        ),
        "statistics": {
            "students": dashboard["student_count"],
            "notes": dashboard["notes_count"],
        },
        "active_session": (
            {
                "id": active_session.id,
                "subject": active_session.subject,
                "status": active_session.status,
                "started_at": active_session.started_at,
                "ended_at": active_session.ended_at,
            }
            if active_session
            else None
        ),
    }