import logging

from app.ai.ai_router import ai_router
from app.ai.modes import AIMode
from app.ai.navigation_engine import navigation_engine
from app.ai.scene import analyze_scene

from app.ai.memory.scene_memory import scene_memory
from app.ai.memory.event_generator import event_generator

from app.ai.voice.alert_manager import voice_alert_manager
from app.ai.voice.priorities import AlertPriority
from app.ai.voice.message_aggregator import message_aggregator

from app.ai.activity.activity_analyzer import activity_analyzer

logger = logging.getLogger(__name__)


class AccessibilityEngine:

    def process(
        self,
        detections,
        frame_width,
        ocr_result=None,
        mode=AIMode.CLASSROOM,
    ):

        detections = detections or []

        ocr_result = ocr_result or {
            "text": "",
            "changed": False,
        }

        try:

            # -------------------------------------------------
            # Scene Analysis
            # -------------------------------------------------

            detections = analyze_scene(
                detections,
            )

            # -------------------------------------------------
            # Navigation
            # -------------------------------------------------

            detections = navigation_engine.navigate(
                detections,
                frame_width,
            )

            # -------------------------------------------------
            # Highest Priority Objects First
            # -------------------------------------------------

            detections.sort(
                key=lambda obj: (
                    obj.get("collision_risk", False),
                    obj.get("approaching", False),
                    obj.get("confidence", 0),
                ),
                reverse=True,
            )

            # -------------------------------------------------
            # AI Mode
            # -------------------------------------------------

            announcements = ai_router.process(
                mode=mode,
                detections=detections,
                ocr_result=ocr_result,
            )

            for message in announcements or []:

                voice_alert_manager.add(
                    message,
                    AlertPriority.MEDIUM,
                )

            # -------------------------------------------------
            # Scene Memory
            # -------------------------------------------------

            events = scene_memory.update(
                detections,
            )

            event_messages = event_generator.build(
                events,
            )

            for message in event_messages:

                text = message.lower()

                if text.startswith("warning"):

                    priority = AlertPriority.CRITICAL

                elif "approaching" in text:

                    priority = AlertPriority.HIGH

                else:

                    priority = AlertPriority.LOW

                voice_alert_manager.add(
                    message,
                    priority,
                )

            # -------------------------------------------------
            # Aggregated Scene Summary
            # -------------------------------------------------

            summaries = message_aggregator.aggregate(
                detections,
            )

            priority_map = {
                "critical": AlertPriority.CRITICAL,
                "high": AlertPriority.HIGH,
                "medium": AlertPriority.MEDIUM,
                "low": AlertPriority.LOW,
            }

            for summary in summaries:

                voice_alert_manager.add(
                    summary["message"],
                    priority_map.get(
                        summary.get(
                            "priority",
                            "low",
                        ),
                        AlertPriority.LOW,
                    ),
                )

            # -------------------------------------------------
            # Classroom Activity Recognition
            # -------------------------------------------------

            activity = activity_analyzer.analyze(
                detections,
            )

            # Example activity announcements

            if (
                activity["classroom_state"]
                == "lecture"
            ):

                voice_alert_manager.add(
                    "Lecture in progress.",
                    AlertPriority.LOW,
                )

            if activity["participation"]:

                voice_alert_manager.add(
                    f"{len(activity['participation'])} student participation event detected.",
                    AlertPriority.MEDIUM,
                )

            inattentive = sum(
                1
                for student in activity["attention"]
                if not student["attentive"]
            )

            if inattentive:

                voice_alert_manager.add(
                    f"{inattentive} students may be distracted.",
                    AlertPriority.LOW,
                )

            # -------------------------------------------------
            # OCR Notifications
            # -------------------------------------------------

            if ocr_result.get("changed"):

                voice_alert_manager.add(
                    "Board content updated.",
                    AlertPriority.MEDIUM,
                )

            # -------------------------------------------------
            # Voice Queue
            # -------------------------------------------------

            spoken = []

            while True:

                message = (
                    voice_alert_manager.next_message()
                )

                if message is None:
                    break

                spoken.append(message)

            # -------------------------------------------------
            # Final Response
            # -------------------------------------------------

            return {

                "success": True,

                "mode": mode.value,

                "objects": detections,

                "object_count": len(
                    detections,
                ),

                "board_text": ocr_result.get(
                    "text",
                    "",
                ),

                "board_updated": ocr_result.get(
                    "changed",
                    False,
                ),

                "activity": activity,

                "announcements": spoken,

                "metadata": {

                    "navigation_enabled": True,

                    "ocr_enabled": True,

                    "scene_memory": True,

                    "voice_queue": True,

                    "message_aggregation": True,

                    "activity_recognition": True,

                    "events_generated": len(
                        events,
                    ),

                    "objects_detected": len(
                        detections,
                    ),

                    "spoken_messages": len(
                        spoken,
                    ),

                    "classroom_state": activity[
                        "classroom_state"
                    ],

                    "participation_events": len(
                        activity["participation"]
                    ),

                    "attention_records": len(
                        activity["attention"]
                    ),
                },
            }

        except Exception:

            logger.exception(
                "Accessibility pipeline failed."
            )

            raise


accessibility_engine = AccessibilityEngine()