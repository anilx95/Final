import os
from typing import Dict, Any


class ExportService:
    @staticmethod
    def generate_txt(title: str, text_content: str) -> str:
        content = f"=========================================\n"
        content += f"{title.upper()}\n"
        content += f"=========================================\n\n"
        content += text_content
        return content

    @staticmethod
    def generate_vtt(subtitles: list) -> str:
        vtt = "WEBVTT - ClassAbly Live Lecture Subtitles\n\n"
        for i, sub in enumerate(subtitles, 1):
            offset = sub.get("timestamp_offset", (i - 1) * 3.0)
            start_sec = int(offset)
            start_ms = int((offset - start_sec) * 1000)
            end_sec = start_sec + 3
            end_ms = start_ms

            sh = start_sec // 3600
            sm = (start_sec % 3600) // 60
            ss = start_sec % 60

            eh = end_sec // 3600
            em = (end_sec % 3600) // 60
            es = end_sec % 60

            start_str = f"{sh:02d}:{sm:02d}:{ss:02d}.{start_ms:03d}"
            end_str = f"{eh:02d}:{em:02d}:{es:02d}.{end_ms:03d}"

            vtt += f"{i}\n"
            vtt += f"{start_str} --> {end_str}\n"
            vtt += f"{sub.get('speaker', 'Teacher')}: {sub.get('text', '')}\n\n"
        return vtt

    @staticmethod
    def generate_pdf_summary(title: str, summary: str, key_points: list, formulas: list) -> str:
        # Markdown/Structured HTML text convertible to PDF or downloaded directly
        doc = f"# {title}\n\n"
        doc += f"## Executive Summary\n{summary}\n\n"
        doc += f"## Key Takeaways\n"
        for kp in key_points:
            doc += f"- {kp}\n"
        doc += f"\n## Core Formulas & Definitions\n"
        for f in formulas:
            doc += f"- `{f}`\n"
        return doc


export_service = ExportService()
