from collections import defaultdict
from fastapi import WebSocket
import logging

logger = logging.getLogger(__name__)


class ConnectionManager:

    def __init__(self):

        self.connections: dict[int, set[WebSocket]] = defaultdict(set)

    async def connect(
        self,
        classroom_id: int,
        websocket: WebSocket,
    ):

        await websocket.accept()

        self.connections[classroom_id].add(
            websocket
        )

        logger.info(
            "WebSocket connected (classroom=%s)",
            classroom_id,
        )

    def disconnect(
        self,
        classroom_id: int,
        websocket: WebSocket,
    ):

        if classroom_id in self.connections:

            self.connections[classroom_id].discard(
                websocket
            )

            if not self.connections[classroom_id]:
                del self.connections[classroom_id]

        logger.info(
            "WebSocket disconnected (classroom=%s)",
            classroom_id,
        )

    async def broadcast(
        self,
        classroom_id: int,
        payload: dict,
    ):

        if classroom_id not in self.connections:
            return

        disconnected = []

        for websocket in self.connections[classroom_id]:

            try:

                await websocket.send_json(payload)

            except Exception:

                disconnected.append(websocket)

        for websocket in disconnected:

            self.disconnect(
                classroom_id,
                websocket,
            )


manager = ConnectionManager()