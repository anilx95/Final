from fastapi import APIRouter, UploadFile, File

from app.api.ai.controller import controller

router = APIRouter(
    prefix="/ai",
    tags=["Artificial Intelligence"],
)


@router.post("/frame")
async def process_frame(
    file: UploadFile = File(...)
):

    image = await file.read()

    # TODO:
    # Decode bytes using OpenCV

    return {

        "message": "Frame received",

        "size": len(image),

    }