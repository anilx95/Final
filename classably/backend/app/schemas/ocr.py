from pydantic import BaseModel

class OCRRequest(BaseModel):
    image_path: str


class OCRResponse(BaseModel):
    extracted_text: str