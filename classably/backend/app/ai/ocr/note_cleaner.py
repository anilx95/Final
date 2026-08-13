import re


class NoteCleaner:

    def clean(self, text: str) -> str:

        text = text.strip()

        # Remove numbering like "1.", "2", "3)"
        text = re.sub(r'^\d+[\.\)]?\s*', '', text)

        # Remove bullets
        text = re.sub(r'^[-•]\s*', '', text)

        replacements = {
            "Compler": "Compiler",
            "Analyter": "Analyzer",
            "Cptimization": "Optimization",
            "keyw0rd": "keyword",
        }

        for wrong, correct in replacements.items():
            text = text.replace(wrong, correct)

        return text


note_cleaner = NoteCleaner()