from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.entities.smart_classroom import SmartDevice, SensorMetric
from app.models.schemas import DeviceCommand
from app.services.ws_manager import manager

router = APIRouter(prefix="/api/devices", tags=["Smart Classroom Devices"])


@router.post("/seed/{classroom_id}")
def seed_devices(classroom_id: int, db: Session = Depends(get_db)):
    existing = db.query(SmartDevice).filter(SmartDevice.classroom_id == classroom_id).count()
    if existing == 0:
        defaults = [
            ("light", "Main Ceiling Lights", {"on": True, "brightness": 80}, "online"),
            ("fan", "Ceiling Fan & Ventilation", {"on": True, "speed": 2}, "online"),
            ("curtain", "Smart Window Blinds", {"open": True}, "online"),
            ("projector", "Smart Board Projector", {"on": True, "slide": 1}, "online"),
            ("door", "Automated Door & Ramp Lock", {"locked": False}, "online"),
            ("emergency", "Emergency SOS Button", {"active": False}, "online"),
        ]
        for dtype, name, state, status_str in defaults:
            db.add(SmartDevice(classroom_id=classroom_id, device_type=dtype, name=name, state=state, status=status_str))

    # Add initial sensor metrics if missing
    existing_sensors = db.query(SensorMetric).filter(SensorMetric.classroom_id == classroom_id).count()
    if existing_sensors == 0:
        metrics = [
            SensorMetric(classroom_id=classroom_id, sensor_type="temperature", value=22.5, unit="°C"),
            SensorMetric(classroom_id=classroom_id, sensor_type="humidity", value=45.0, unit="%"),
            SensorMetric(classroom_id=classroom_id, sensor_type="noise_level", value=38.2, unit="dB"),
            SensorMetric(classroom_id=classroom_id, sensor_type="air_quality", value=95.0, unit="AQI"),
        ]
        for m in metrics:
            db.add(m)

    db.commit()
    return {"message": "Seeded smart classroom devices and environmental sensors"}


@router.get("")
def list_devices(classroom_id: Optional[int] = 1, db: Session = Depends(get_db)):
    q = db.query(SmartDevice)
    if classroom_id is not None:
        q = q.filter(SmartDevice.classroom_id == classroom_id)
    devices = q.all()
    if not devices and classroom_id:
        seed_devices(classroom_id, db)
        devices = db.query(SmartDevice).filter(SmartDevice.classroom_id == classroom_id).all()
    return devices


@router.get("/sensors/{classroom_id}")
def get_sensor_telemetry(classroom_id: int, db: Session = Depends(get_db)):
    metrics = db.query(SensorMetric).filter(SensorMetric.classroom_id == classroom_id).order_by(SensorMetric.timestamp.desc()).limit(10).all()
    return [
        {
            "id": m.id,
            "type": m.sensor_type,
            "value": m.value,
            "unit": m.unit,
            "timestamp": m.timestamp.strftime("%H:%M:%S"),
        }
        for m in metrics
    ]


@router.post("/{device_id}/command")
async def send_command(device_id: int, cmd: DeviceCommand, db: Session = Depends(get_db)):
    device = db.get(SmartDevice, device_id)
    if not device:
        raise HTTPException(404, "Device not found")

    state = dict(device.state or {})

    if cmd.action == "toggle":
        for key in ("on", "open", "locked", "active"):
            if key in state:
                state[key] = not state[key]
                break
    elif cmd.action == "set" and isinstance(cmd.value, dict):
        state.update(cmd.value)

    device.state = state
    device.last_updated = datetime.utcnow()
    db.commit()
    db.refresh(device)

    # Broadcast device state change to WebSocket clients
    await manager.broadcast_to_dashboards("device_state_changed", {
        "device_id": device.id,
        "device_type": device.device_type,
        "name": device.name,
        "state": state,
    })

    return {"device_id": device.id, "new_state": state}
