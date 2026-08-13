import logging

from app.ai.events.storage import storage

logger = logging.getLogger(__name__)


class EventDispatcher:
    """
    Dispatches AI events to all registered consumers.

    Current Consumers:
        • In-memory storage
        • Timeline Engine
        • Analytics Engine
        • Voice Alerts
        • WebSocket (future)
        • Database (future)
        • Notification System (future)
    """

    def __init__(self):

        self.total_events = 0
        self.failed_events = 0

    def dispatch(
        self,
        context,
        events,
    ):

        if not events:
            return context

        for event in events:

            try:

                self._dispatch_single(
                    context,
                    event,
                )

                self.total_events += 1

            except Exception:

                self.failed_events += 1

                logger.exception(
                    "Failed to dispatch event %s",
                    event.event_type,
                )

        return context

    def _dispatch_single(

        self,

        context,

        event,

    ):

        # ----------------------------------
        # Save Event
        # ----------------------------------

        storage.save(event)

        # ----------------------------------
        # Pipeline Context
        # ----------------------------------

        context.events.append(event)

        # ----------------------------------
        # Voice Queue
        # ----------------------------------

        if hasattr(context, "speech_queue"):

            context.speech_queue.append(

                event.event_type

            )

        # ----------------------------------
        # Accessibility Alerts
        # ----------------------------------

        if hasattr(context, "alerts"):

            if event.priority in [

                "high",

                "critical",

            ]:

                context.alerts.append(

                    event.event_type

                )

        # ----------------------------------
        # Future Database
        # ----------------------------------

        # event_service.save(event)

        # ----------------------------------
        # Future Timeline
        # ----------------------------------

        # timeline_engine.add(event)

        # ----------------------------------
        # Future Analytics
        # ----------------------------------

        # analytics_engine.consume(event)

        # ----------------------------------
        # Future Dashboard
        # ----------------------------------

        self._broadcast(event)

        # ----------------------------------
        # Emergency Notification
        # ----------------------------------

        if event.priority == "critical":

            self._notify(event)

        logger.info(

            "[%s] %s",

            event.priority.upper(),

            event.event_type,

        )

    def _broadcast(

        self,

        event,

    ):

        try:

            # websocket_manager.broadcast(...)

            pass

        except RuntimeError:

            logger.debug(

                "Broadcast skipped"

            )

    def _notify(

        self,

        event,

    ):

        logger.warning(

            "Critical Event: %s",

            event.event_type,

        )

        # notification_service.send(event)

    def stats(self):

        return {

            "total_events": self.total_events,

            "failed_events": self.failed_events,

            "stored_events": len(

                storage.latest()

            ),

        }


dispatcher = EventDispatcher()