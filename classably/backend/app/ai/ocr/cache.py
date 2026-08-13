import hashlib


class OCRCache:

    def __init__(self):

        self.last_hash = ""
        self.last_text = ""
        self.last_confidence = 0.0
        self.last_line_count = 0

    def changed(self, text):

        current = hashlib.md5(
            text.encode("utf-8")
        ).hexdigest()

        if current == self.last_hash:
            return False

        self.last_hash = current
        self.last_text = text

        return True

    def update_metadata(
        self,
        confidence,
        line_count,
    ):

        self.last_confidence = confidence
        self.last_line_count = line_count

    def get_cached_result(self):

        return {
            "text": self.last_text,
            "changed": False,
            "confidence": self.last_confidence,
            "line_count": self.last_line_count,
        }


ocr_cache = OCRCache()