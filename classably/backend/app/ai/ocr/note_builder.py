import difflib


class NoteBuilder:

    def __init__(self):
        self.notes = []

    def add_lines(self, lines):

        added = False

        for line in lines:

            line = line.strip()

            if not line:
                continue

            if not self.notes:
                self.notes.append(line)
                added = True
                continue

            duplicate = False

            for existing in self.notes:

                similarity = difflib.SequenceMatcher(
                    None,
                    existing,
                    line,
                ).ratio()

                if similarity >= 0.90:
                    duplicate = True
                    break

            if not duplicate:
                self.notes.append(line)
                added = True

        return added

    def get_notes(self):
        return self.notes

    def clear(self):
        self.notes.clear()


note_builder = NoteBuilder()