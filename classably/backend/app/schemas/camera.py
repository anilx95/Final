from pydantic import BaseModel


class CameraHealth(BaseModel):
    status: str
    service: str


class FrameResponse(BaseModel):
    success: bool
    filename: str
    size: int
    timestamp: str
    message: str