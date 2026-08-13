from fastapi import WebSocket


class ConnectionManager:

    def __init__(self):

        self.connections = set()

    async def connect(
        self,
        websocket: WebSocket,
    ):

        await websocket.accept()

        self.connections.add(
            websocket
        )

    def disconnect(
        self,
        websocket: WebSocket,
    ):

        self.connections.discard(
            websocket
        )

    async def broadcast(
        self,
        data,
    ):

        dead = []

        for ws in self.connections:

            try:

                await ws.send_json(data)

            except Exception:

                dead.append(ws)

        for ws in dead:

            self.disconnect(ws)


manager = ConnectionManager()