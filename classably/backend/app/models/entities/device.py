"""
Device Entity Models
Re-exports SmartDevice, CameraSource, and SensorMetric from smart_classroom.
"""

from app.models.entities.smart_classroom import (
    SmartDevice,
    CameraSource,
    SensorMetric,
)

__all__ = ["SmartDevice", "CameraSource", "SensorMetric"]
