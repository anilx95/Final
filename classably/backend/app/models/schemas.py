from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel


class StudentCreate(BaseModel):
    name: str
    roll_number: str
    disability_type: str = "mobility"
    rfid_tag: Optional[str] = None
    ble_beacon_id: Optional[str] = None
    classroom_id: Optional[int] = None


class StudentOut(BaseModel):
    id: int
    name: str
    roll_number: str
    disability_type: str
    classroom_id: Optional[int]
    preferred_font_scale: float
    preferred_theme: str
    voice_only_mode: bool

    class Config:
        from_attributes = True


class ClassroomCreate(BaseModel):
    name: str
    building: str = "Main Block"
    floor: int = 1
    pos_x: float = 0
    pos_y: float = 0


class AttendanceMark(BaseModel):
    student_id: int
    classroom_id: int
    marked_via: str = "rfid"
    synced: bool = True


class AssistRequestCreate(BaseModel):
    student_id: int
    classroom_id: int
    request_type: str = "general"


class AssistRequestUpdate(BaseModel):
    status: str  # acknowledged, resolved


class NoteCreate(BaseModel):
    classroom_id: int
    title: str = "Untitled Lecture"
    raw_transcript: str
    language: str = "en"


class VoiceCommandIn(BaseModel):
    student_id: int
    classroom_id: int
    text: str


class DeviceCommand(BaseModel):
    action: str
    value: Optional[Any] = None


class NavigationQuery(BaseModel):
    start: str
    end: str
    avoid_narrow: bool = True


class ProfileEventIn(BaseModel):
    student_id: int
    event_type: str
    value: dict[str, Any] = {}


class SyncBatch(BaseModel):
    attendance_ids: list[int] = []
    request_ids: list[int] = []
    note_ids: list[int] = []


class DashboardOverview(BaseModel):
    total_students: int
    total_teachers: int
    total_classrooms: int
    total_devices: int

    attendance_today: int
    lecture_notes_today: int
    voice_commands_today: int
    accessibility_events_today: int

    connected_devices: int
    offline_devices: int


class AttendanceDashboard(BaseModel):
    present: int
    absent: int
    total: int
    attendance_percentage: float


class VoiceDashboard(BaseModel):
    total_commands: int
    successful_commands: int
    failed_commands: int


class DeviceDashboard(BaseModel):
    total_devices: int
    online_devices: int
    offline_devices: int


class AccessibilityDashboard(BaseModel):
    total_events: int
    voice_only_users: int
    high_contrast_users: int
    large_font_users: int


class AuditLogResponse(BaseModel):
    id: int
    user_id: Optional[int]
    action: str
    module: str
    entity_id: Optional[int]
    details: dict[str, Any]
    ip_address: Optional[str]
    user_agent: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class AuditLogListResponse(BaseModel):
    total: int
    logs: list[AuditLogResponse]