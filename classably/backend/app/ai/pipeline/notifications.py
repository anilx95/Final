class NotificationEngine:

    def generate(
        self,
        accessibility_result,
    ):

        return accessibility_result.get(
            "announcements",
            [],
        )


notification_engine = NotificationEngine()