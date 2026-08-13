from typing import Any

from pydantic import BaseModel


class PipelineResponse(BaseModel):
    success: bool

    processing_time: float

    analytics: dict[str, Any]

    timeline: list[dict[str, Any]]

    navigation: dict[str, Any]

    voice_messages: list[str]

    alerts: list[str]

    metadata: dict[str, Any]

    errors: list[str]