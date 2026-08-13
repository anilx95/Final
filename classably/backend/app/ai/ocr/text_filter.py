import re


class OCRTextFilter:

    MIN_LENGTH = 3
    MIN_CONFIDENCE = 0.80

    def is_valid(self, text: str, confidence: float) -> bool:

        text = text.strip()

        # Low confidence
        if confidence < self.MIN_CONFIDENCE:
            return False

        # Too short
        if len(text) < self.MIN_LENGTH:
            return False

        # Numbers only
        if text.isdigit():
            return False

        # Symbols only
        if re.fullmatch(r"[\W_]+", text):
            return False

        # Single alphabet
        if re.fullmatch(r"[A-Za-z]", text):
            return False

        # Common OCR garbage
        garbage = {
            "=",
            "|",
            "||",
            "11",
            "111",
            "l",
            "I",
            "int",
            "yion",
            "Code Gr",
        }

        if text in garbage:
            return False

        return True


ocr_text_filter = OCRTextFilter()