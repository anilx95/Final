"""
Redis key builders for ClassAbly.
Keeping key formats centralized prevents inconsistencies.
"""


def classroom_key(classroom_id: int) -> str:
    return f"classroom:{classroom_id}"


def student_key(student_id: int) -> str:
    return f"student:{student_id}"


def attendance_key(classroom_id: int) -> str:
    return f"attendance:{classroom_id}"


def analytics_key(classroom_id: int) -> str:
    return f"analytics:{classroom_id}"


def stream_key(classroom_id: int) -> str:
    return f"stream:{classroom_id}"


def ai_result_key(request_id: str) -> str:
    return f"ai_result:{request_id}"


def device_key(device_id: str) -> str:
    return f"device:{device_id}"


def dashboard_key(dashboard_id: str) -> str:
    return f"dashboard:{dashboard_id}"


def session_key(session_id: str) -> str:
    return f"session:{session_id}"