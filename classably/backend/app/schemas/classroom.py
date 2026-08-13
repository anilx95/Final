from pydantic import BaseModel


class ClassroomCreate(BaseModel):
    name: str
    building: str = "Main Block"
    floor: int = 1
    pos_x: float = 0.0
    pos_y: float = 0.0
    has_step_access_only: bool = False


class ClassroomResponse(ClassroomCreate):
    id: int

    class Config:
        from_attributes = True