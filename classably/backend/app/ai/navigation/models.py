from dataclasses import dataclass, field


@dataclass
class NavigationResult:
    """
    Final navigation decision returned by the
    Navigation Engine.
    """

    safe_direction: str = "forward"

    recommended_action: str = "Continue"

    warning_level: str = "none"

    blocked_paths: list[str] = field(
        default_factory=list
    )

    distance_to_obstacle: float | None = None

    obstacle_class: str | None = None

    tts_message: str = ""

    confidence: float = 1.0