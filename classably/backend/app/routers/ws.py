from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.ws_manager import manager

router = APIRouter()


@router.websocket("/ws/dashboard")
async def dashboard_ws(websocket: WebSocket):
    """Teacher Command Center connects here for live updates."""
    await manager.connect_dashboard(websocket)
    try:
        while True:
            await websocket.receive_text()  # dashboard is mostly a listener
    except WebSocketDisconnect:
        manager.disconnect_dashboard(websocket)


@router.websocket("/ws/device/{device_id}")
async def device_ws(websocket: WebSocket, device_id: str):
    """
    ESP32 (real or simulated) connects here, identified by device_id, e.g.
    'classroom-1'. Backend pushes commands down; device pushes telemetry up
    (e.g. RFID tap events), which we relay onward to the dashboard.
    """
    await manager.connect_device(device_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()
            await manager.broadcast_to_dashboards("device_telemetry", {
                "device_id": device_id, "raw": data,
            })
    except WebSocketDisconnect:
        manager.disconnect_device(device_id)
