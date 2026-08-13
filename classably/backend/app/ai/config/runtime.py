from dataclasses import dataclass


@dataclass
class RuntimeState:

    fps: float = 0.0

    latency: float = 0.0

    frames_processed: int = 0

    dropped_frames: int = 0

    uptime_seconds: float = 0.0