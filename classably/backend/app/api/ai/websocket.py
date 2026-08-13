from fastapi import WebSocket


class AIWebSocket:

    async def connect(

        self,

        websocket: WebSocket,

    ):

        await websocket.accept()

    async def disconnect(

        self,

        websocket,

    ):

        await websocket.close()


ws = AIWebSocket()