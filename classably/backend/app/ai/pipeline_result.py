from dataclasses import dataclass, field


@dataclass
class PipelineResult:

    success: bool = True

    objects: list = field(default_factory=list)

    board_text: str = ""

    board_updated: bool = False

    announcements: list = field(default_factory=list)

    processing_time_ms: float = 0

    metadata: dict = field(default_factory=dict)