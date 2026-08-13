from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.websocket.manager import manager

router = APIRouter()


@router.websocket("/ws/classroom/{classroom_id}")
async def classroom_stream(
    websocket: WebSocket,
    classroom_id: int,
):

    await manager.connect(
        classroom_id,
        websocket,
    )

    try:

        while True:

            await websocket.receive_text()

    except WebSocketDisconnect:

        manager.disconnect(
            classroom_id,
            websocket,
        )