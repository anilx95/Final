"""
NEW FEATURE (differentiator #2): Adaptive Accessibility Profiles.

The original spec lists "personalized accessibility profiles that
auto-adjust display settings" as a *future* enhancement. This module builds
it now: it watches a rolling window of interaction events per student
(font-size bumps, repeated voice commands, slow manual responses) and
recommends a UI mode switch -- without the student having to open a
settings screen.

This is intentionally a transparent, explainable rule engine (not a black
box model) so a teacher or student can always see *why* a switch was
suggested -- important for an accessibility tool where trust matters.
"""
from collections import Counter
from datetime import datetime, timedelta

WINDOW_MINUTES = 15
FONT_INCREASE_THRESHOLD = 2      # 2+ manual font bumps -> suggest large-text mode
REPEATED_VOICE_THRESHOLD = 3     # same voice intent failing 3+ times -> suggest voice-first mode
SLOW_RESPONSE_THRESHOLD = 3      # 3+ slow manual interactions -> suggest voice-first mode


def recommend_profile(events: list[dict]):
    """
    events: list of dicts with keys event_type, value, created_at (datetime)
    Returns a recommendation dict explaining exactly which signals fired.
    """
    cutoff = datetime.utcnow() - timedelta(minutes=WINDOW_MINUTES)
    recent = [e for e in events if e["created_at"] >= cutoff]

    counts = Counter(e["event_type"] for e in recent)
    reasons = []
    recommended_mode = None

    if counts.get("font_increase", 0) >= FONT_INCREASE_THRESHOLD:
        recommended_mode = "large_text"
        reasons.append(
            f"Font size increased manually {counts['font_increase']} times in the last "
            f"{WINDOW_MINUTES} min"
        )

    if counts.get("repeated_voice_command", 0) >= REPEATED_VOICE_THRESHOLD:
        recommended_mode = "voice_first"
        reasons.append(
            f"{counts['repeated_voice_command']} repeated voice commands detected -- "
            "student may be relying on voice as primary input"
        )

    if counts.get("slow_response", 0) >= SLOW_RESPONSE_THRESHOLD:
        recommended_mode = recommended_mode or "voice_first"
        reasons.append(
            f"{counts['slow_response']} slow manual interactions -- "
            "touch/typing may currently be difficult"
        )

    if counts.get("manual_toggle", 0) > 0:
        # respect explicit user choice above all heuristics
        return {
            "recommended_mode": None,
            "reasons": ["Student manually set preferences -- adaptive suggestions paused"],
            "confidence": "n/a",
        }

    if not recommended_mode:
        return {
            "recommended_mode": None,
            "reasons": ["No strong signal yet -- current profile looks fine"],
            "confidence": "low",
        }

    confidence = "high" if len(reasons) > 1 else "medium"
    return {
        "recommended_mode": recommended_mode,
        "reasons": reasons,
        "confidence": confidence,
    }
