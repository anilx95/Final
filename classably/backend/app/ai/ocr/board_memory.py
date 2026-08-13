import difflib
import time

from app.ai.config import OCR_CHANGE_THRESHOLD


class BoardMemory:

    def __init__(self):

        self.last_text = ""

        self.last_update = 0

    def process(self, text):

        text = text.strip()

        if not text:

            return {
                "changed": False,
                "new_text": "",
            }

        similarity = difflib.SequenceMatcher(

            None,

            self.last_text,

            text,

        ).ratio()

        if similarity >= OCR_CHANGE_THRESHOLD:

            return {

                "changed": False,

                "new_text": "",

            }

        previous = self.last_text

        self.last_text = text

        self.last_update = time.time()

        added = text.replace(previous, "").strip()

        if not added:

            added = text

        return {

            "changed": True,

            "new_text": added,

            "full_text": text,

        }


board_memory = BoardMemory()