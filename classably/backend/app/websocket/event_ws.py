import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.ws_manager import ws_manager

logger = logging.getLogger(__name__)

router = APIRouter()


@router.websocket("/events/{classroom_id}")
async def event_socket(
    websocket: WebSocket,
    classroom_id: int,
):
    await ws_manager.connect(
        classroom_id,
        websocket,
    )
    try:
        while True:
            text = await websocket.receive_text()
            try:
                msg = json.loads(text)
                peer_id = msg.get("peer_id")
                role = msg.get("role", "")

                # Register peer_id from EVERY message that carries one.
                # This ensures that by the time an offer/answer/candidate
                # arrives the sender is already in the routing map.
                if peer_id:
                    ws_manager.peer_id_map[peer_id] = websocket
                    # Teacher also registers under the well-known key
                    # "teacher" so students can target_id="teacher".
                    if role == "teacher":
                        ws_manager.peer_id_map["teacher"] = websocket
                    logger.debug(
                        "Registered peer_id=%s (role=%s) from %s message",
                        peer_id, role, msg.get("type", "unknown"),
                    )

                await ws_manager.relay_message(classroom_id, websocket, msg)
            except Exception as e:
                logger.debug(f"Received raw text on event socket: {text[:200]}")
    except WebSocketDisconnect:
        ws_manager.disconnect(
            classroom_id,
            websocket,
        )