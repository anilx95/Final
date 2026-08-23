from collections import defaultdict
import logging

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class WebSocketManager:

    def __init__(self):

        self.dashboard_connections: list[WebSocket] = []

        self.device_connections: dict[str, list[WebSocket]] = defaultdict(list)

        self.classroom_connections: dict[str, list[WebSocket]] = defaultdict(list)

        # Maps peer_id -> WebSocket for targeted signaling (WebRTC)
        self.peer_id_map: dict[str, WebSocket] = {}

    # ---------------------------------------------------------
    # Dashboard
    # ---------------------------------------------------------

    async def connect_dashboard(
        self,
        websocket: WebSocket,
    ):

        await websocket.accept()

        self.dashboard_connections.append(websocket)

        logger.info(
            "Dashboard connected. Total=%d",
            len(self.dashboard_connections),
        )

    def disconnect_dashboard(
        self,
        websocket: WebSocket,
    ):

        if websocket in self.dashboard_connections:

            self.dashboard_connections.remove(websocket)

            logger.info(
                "Dashboard disconnected. Total=%d",
                len(self.dashboard_connections),
            )

    # ---------------------------------------------------------
    # Devices
    # ---------------------------------------------------------

    async def connect_device(
        self,
        device_id: str | int,
        websocket: WebSocket,
    ):

        await websocket.accept()

        key = str(device_id)

        self.device_connections[key].append(websocket)

        logger.info(
            "Device connected (device_id=%s)",
            key,
        )

    def disconnect_device(
        self,
        device_id: str | int,
        websocket: WebSocket = None,
    ):

        key = str(device_id)

        if websocket is None:
            self.device_connections.pop(key, None)
            return

        if websocket in self.device_connections[key]:

            self.device_connections[key].remove(websocket)

            logger.info(
                "Device disconnected (device_id=%s)",
                key,
            )

    async def send_to_device(
        self,
        device_id: str | int,
        payload: dict,
    ) -> bool:

        key = str(device_id)

        sockets = list(self.device_connections.get(key, []))

        # Also try matching numeric ID if key is 'classroom-1'
        if not sockets and "classroom-" in key:
            raw_id = key.replace("classroom-", "")
            sockets = list(self.device_connections.get(raw_id, []))
        elif not sockets and key.isdigit():
            sockets = list(self.device_connections.get(f"classroom-{key}", []))

        sent = False
        dead = []

        for ws in sockets:
            try:
                await ws.send_json(payload)
                sent = True
            except Exception:
                dead.append(ws)

        for ws in dead:
            self.disconnect_device(key, ws)

        return sent

    async def broadcast_to_devices(
        self,
        classroom_id: str | int,
        payload: dict,
    ):
        return await self.send_to_device(f"classroom-{classroom_id}", payload)

    # ---------------------------------------------------------
    # Classroom Events
    # ---------------------------------------------------------

    async def connect(
        self,
        classroom_id: str | int,
        websocket: WebSocket,
        peer_id: str | None = None,
    ):

        await websocket.accept()

        key = str(classroom_id)

        self.classroom_connections[key].append(websocket)

        if peer_id:
            self.peer_id_map[peer_id] = websocket
            logger.info(
                "Event socket connected (classroom=%s, peer_id=%s)",
                key,
                peer_id,
            )
        else:
            logger.info(
                "Event socket connected (classroom=%s)",
                key,
            )

    def disconnect(
        self,
        classroom_id: str | int,
        websocket: WebSocket,
    ):

        key = str(classroom_id)

        if websocket in self.classroom_connections[key]:

            self.classroom_connections[key].remove(websocket)

            # Remove from peer_id_map if registered
            stale_peers = [pid for pid, ws in self.peer_id_map.items() if ws is websocket]
            for pid in stale_peers:
                del self.peer_id_map[pid]

            logger.info(
                "Event socket disconnected (classroom=%s)",
                key,
            )

    # ---------------------------------------------------------
    # Broadcast Classroom Events
    # ---------------------------------------------------------

    async def broadcast_event(
        self,
        classroom_id: str | int,
        event: dict,
    ):

        key = str(classroom_id)

        dead = []

        for ws in self.classroom_connections[key]:

            try:

                await ws.send_json(event)

            except Exception:

                dead.append(ws)

        for ws in dead:

            self.disconnect(
                key,
                ws,
            )

    async def relay_message(
        self,
        classroom_id: str | int,
        sender_ws: WebSocket,
        message: dict,
    ):
        key = str(classroom_id)
        target_id = message.get("target_id")
        msg_type = message.get("type", "unknown")
        dead = []

        # Always register sender peer_id so future messages can be routed
        sender_peer_id = message.get("peer_id")
        if sender_peer_id:
            self.peer_id_map[sender_peer_id] = sender_ws

        if target_id and target_id != "all":
            # ── Directed relay ──────────────────────────────────
            target_ws = self.peer_id_map.get(target_id)
            if target_ws and target_ws != sender_ws:
                try:
                    await target_ws.send_json(message)
                    logger.debug(
                        "Relayed %s from peer=%s -> target=%s",
                        msg_type, sender_peer_id, target_id,
                    )
                except Exception:
                    dead.append(target_ws)
            else:
                # Target not yet registered.
                # For signaling messages (offer/answer/candidate) we must
                # NOT broadcast — doing so sends every student every offer
                # and corrupts multi-student WebRTC.
                # For non-signaling messages we can safely broadcast.
                if msg_type in ("offer", "answer", "candidate"):
                    logger.warning(
                        "target_id=%s not in peer_id_map for %s message, dropping (peer will retry)",
                        target_id, msg_type,
                    )
                else:
                    # Safe to broadcast non-signaling events
                    for ws in list(self.classroom_connections[key]):
                        if ws != sender_ws:
                            try:
                                await ws.send_json(message)
                            except Exception:
                                dead.append(ws)
        else:
            # ── Broadcast to all classroom members except sender ──
            for ws in list(self.classroom_connections[key]):
                if ws != sender_ws:
                    try:
                        await ws.send_json(message)
                    except Exception:
                        dead.append(ws)

        for ws in dead:
            self.disconnect(key, ws)

    # ---------------------------------------------------------
    # Broadcast Dashboard
    # ---------------------------------------------------------

    async def broadcast_to_dashboards(
        self,
        event_type: str,
        payload: dict,
    ):

        dead = []

        message = {

            "type": event_type,

            "payload": payload,

        }

        for ws in self.dashboard_connections:

            try:

                await ws.send_json(message)

            except Exception:

                dead.append(ws)

        for ws in dead:

            self.disconnect_dashboard(ws)


ws_manager = WebSocketManager()

manager = ws_manager