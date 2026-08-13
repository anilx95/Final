class NavigationMode:

    def process(
        self,
        detections,
    ):

        if detections is None:
            return [
                "No obstacles detected."
            ]

        messages = []

        # -----------------------------------------
        # Nearest obstacles first
        # -----------------------------------------

        detections = sorted(
            detections,
            key=lambda x: x.get(
                "distance",
                999,
            )
        )

        for obj in detections:

            label = obj.get(
                "class_name",
                "object",
            )

            direction = obj.get(
                "direction",
                "ahead",
            )

            distance = obj.get(
                "distance",
            )

            collision = obj.get(
                "collision_warning",
                False,
            )

            risk = obj.get(
                "risk",
                0,
            )

            # -----------------------------------------
            # High Priority Warning
            # -----------------------------------------

            if collision:

                if distance is not None:

                    messages.append(
                        f"Warning. {label} {direction}, {distance:.1f} meters away."
                    )

                else:

                    messages.append(
                        f"Warning. {label} {direction}."
                    )

                continue

            # -----------------------------------------
            # Normal Navigation
            # -----------------------------------------

            if distance is not None:

                if direction == "ahead":

                    messages.append(
                        f"{label} ahead, {distance:.1f} meters."
                    )

                else:

                    messages.append(
                        f"{label} to your {direction}, {distance:.1f} meters."
                    )

            else:

                messages.append(
                    f"{label} detected."
                )

        # -----------------------------------------
        # Remove duplicate messages
        # -----------------------------------------

        unique = []

        seen = set()

        for message in messages:

            if message not in seen:

                unique.append(
                    message
                )

                seen.add(
                    message
                )

        if not unique:

            unique.append(
                "Path appears clear."
            )

        return unique


navigation_mode = NavigationMode()