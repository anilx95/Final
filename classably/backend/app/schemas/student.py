from pydantic import BaseModel


class StudentCreate(BaseModel):
    name: str
    roll_number: str
    disability_type: str = "mobility"
    rfid_tag: str | None = None
    ble_beacon_id: str | None = None
    classroom_id: int
    preferred_font_scale: float = 1.0
    preferred_theme: str = "default"
    voice_only_mode: bool = False


class StudentResponse(StudentCreate):
    id: int

    class Config:
        from_attributes = True

class StudentUpdate(BaseModel):
    name: str | None = None
    roll_number: str | None = None
    disability_type: str | None = None
    rfid_tag: str | None = None
    ble_beacon_id: str | None = None
    classroom_id: int | None = None
    preferred_font_scale: float | None = None
    preferred_theme: str | None = None
    voice_only_mode: bool | None = None


class StudentStatistics(BaseModel):
    total_students: int