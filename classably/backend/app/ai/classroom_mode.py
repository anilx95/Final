class ClassroomMode:

    def process(
        self,
        detections,
        ocr_result=None,
    ):

        messages = []

        if detections is None:
            detections = []

        if ocr_result is None:
            ocr_result = {
                "text": "",
                "changed": False,
            }

        # ---------------------------------
        # Sort by nearest obstacle
        # ---------------------------------

        detections = sorted(
            detections,
            key=lambda x: x.get(
                "distance",
                999,
            )
        )

        labels = {
            obj["class_name"]
            for obj in detections
        }

        # ---------------------------------
        # Count objects
        # ---------------------------------

        person_count = sum(
            1
            for obj in detections
            if obj["class_name"] == "person"
        )

        chair_count = sum(
            1
            for obj in detections
            if obj["class_name"] == "chair"
        )

        desk_count = sum(
            1
            for obj in detections
            if obj["class_name"] in (
                "desk",
                "dining table",
            )
        )

        # ---------------------------------
        # Collision warnings
        # ---------------------------------

        for obj in detections:

            if obj.get(
                "collision_warning",
                False,
            ):

                direction = obj.get(
                    "direction",
                    "ahead",
                )

                messages.append(
                    f"Caution. {obj['class_name']} {direction}."
                )

        # ---------------------------------
        # People
        # ---------------------------------

        if person_count == 1:

            messages.append(
                "One person detected."
            )

        elif person_count > 1:

            messages.append(
                f"{person_count} people detected."
            )

        # ---------------------------------
        # Chairs
        # ---------------------------------

        if chair_count == 1:

            messages.append(
                "One chair detected."
            )

        elif chair_count > 1:

            messages.append(
                f"{chair_count} chairs detected."
            )

        # ---------------------------------
        # Desks
        # ---------------------------------

        if desk_count == 1:

            messages.append(
                "One desk detected."
            )

        elif desk_count > 1:

            messages.append(
                f"{desk_count} desks detected."
            )

        # ---------------------------------
        # Learning materials
        # ---------------------------------

        if "laptop" in labels:

            messages.append(
                "Laptop detected."
            )

        if "book" in labels:

            messages.append(
                "Book detected."
            )

        if "cell phone" in labels:

            messages.append(
                "Mobile phone detected."
            )

        if "backpack" in labels:

            messages.append(
                "Backpack detected."
            )

        if "bottle" in labels:

            messages.append(
                "Water bottle detected."
            )

        # ---------------------------------
        # Board OCR
        # ---------------------------------

        text = ocr_result.get(
            "text",
            "",
        ).strip()

        changed = ocr_result.get(
            "changed",
            False,
        )

        if changed and text:

            messages.append(
                "The board has been updated."
            )

            messages.append(
                f"Board says: {text}"
            )

        # ---------------------------------
        # Default
        # ---------------------------------

        if not messages:

            messages.append(
                "Classroom is clear."
            )

        # ---------------------------------
        # Remove duplicates
        # ---------------------------------

        unique = []

        seen = set()

        for message in messages:

            if message not in seen:

                unique.append(message)

                seen.add(message)

        return unique


classroom_mode = ClassroomMode()