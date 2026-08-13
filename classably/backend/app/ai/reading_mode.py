class ReadingMode:

    MAX_LENGTH = 500

    def process(
        self,
        detections,
        ocr_result=None,
    ):

        messages = []

        # -----------------------------------------
        # Validate OCR Result
        # -----------------------------------------

        if not ocr_result:

            return [
                "No board detected."
            ]

        full_text = (
            ocr_result.get(
                "full_text",
                "",
            ).strip()
        )

        new_text = (
            ocr_result.get(
                "new_text",
                "",
            ).strip()
        )

        changed = ocr_result.get(
            "changed",
            False,
        )

        # -----------------------------------------
        # No Text Found
        # -----------------------------------------

        if not full_text:

            return [
                "No readable text found."
            ]

        # -----------------------------------------
        # Board Updated
        # -----------------------------------------

        if changed:

            messages.append(
                "The board has been updated."
            )

            if new_text:

                if len(new_text) > self.MAX_LENGTH:

                    new_text = (
                        new_text[: self.MAX_LENGTH]
                        + "..."
                    )

                messages.append(
                    f"New text: {new_text}"
                )

        else:

            display_text = full_text

            if len(display_text) > self.MAX_LENGTH:

                display_text = (
                    display_text[: self.MAX_LENGTH]
                    + "..."
                )

            messages.append(
                f"Board text: {display_text}"
            )

        # -----------------------------------------
        # Statistics
        # -----------------------------------------

        word_count = len(
            full_text.split()
        )

        messages.append(
            f"Detected {word_count} words."
        )

        return messages


reading_mode = ReadingMode()