import os
import fitz  # PyMuPDF
from typing import Dict, Any, List, Optional
from datetime import datetime


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
            start_sec = max(0, int(offset))
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
    def generate_pdf_summary(
        title: str,
        summary: str,
        key_points: Optional[List[str]] = None,
        formulas: Optional[List[str]] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> bytes:
        """Generate a valid, professional A4 PDF summary document using PyMuPDF (fitz)."""
        doc = fitz.open()
        page = doc.new_page(width=595, height=842)  # Standard A4 size in points

        # Header banner (Dark Slate #0f172a)
        header_rect = fitz.Rect(0, 0, 595, 80)
        page.draw_rect(header_rect, color=None, fill=(0.06, 0.09, 0.16))

        page.insert_text((40, 36), "ClassAbly Smart Lecture Summary", fontsize=18, fontname="helv", color=(0.22, 0.74, 0.97))
        page.insert_text((40, 58), "AI-Generated Accessible Study Notes & Academic Artifact", fontsize=10, fontname="helv", color=(0.58, 0.64, 0.72))

        y = 110
        # Title
        page.insert_text((40, y), title[:60] if title else "Lecture Summary", fontsize=16, fontname="hebo", color=(0.06, 0.09, 0.16))
        y += 24

        # Meta info
        if metadata:
            meta_str = " | ".join([f"{k}: {v}" for k, v in metadata.items() if v])
            if meta_str:
                page.insert_text((40, y), meta_str, fontsize=9, fontname="helv", color=(0.4, 0.45, 0.55))
                y += 20

        # Section: Executive Summary
        y += 10
        page.draw_rect(fitz.Rect(40, y - 14, 555, y + 2), color=None, fill=(0.94, 0.96, 0.98))
        page.insert_text((44, y - 2), "EXECUTIVE SUMMARY", fontsize=11, fontname="hebo", color=(0.12, 0.35, 0.65))
        y += 18

        # Wrap and insert summary text
        summary_rect = fitz.Rect(40, y, 555, y + 140)
        page.insert_textbox(summary_rect, summary or "No lecture summary available.", fontsize=10, fontname="helv", color=(0.15, 0.18, 0.22))
        y += 140

        # Section: Key Points
        if key_points:
            page.draw_rect(fitz.Rect(40, y - 14, 555, y + 2), color=None, fill=(0.94, 0.96, 0.98))
            page.insert_text((44, y - 2), "KEY TAKEAWAYS & HIGHLIGHTS", fontsize=11, fontname="hebo", color=(0.12, 0.35, 0.65))
            y += 18
            for kp in key_points[:8]:
                kp_clean = f"•  {kp}"
                kp_rect = fitz.Rect(40, y, 555, y + 22)
                page.insert_textbox(kp_rect, kp_clean, fontsize=9.5, fontname="helv", color=(0.15, 0.18, 0.22))
                y += 22

        # Section: Formulas & Definitions
        if formulas:
            y += 8
            page.draw_rect(fitz.Rect(40, y - 14, 555, y + 2), color=None, fill=(0.94, 0.96, 0.98))
            page.insert_text((44, y - 2), "CORE DEFINITIONS & FORMULAS", fontsize=11, fontname="hebo", color=(0.12, 0.35, 0.65))
            y += 18
            for f in formulas[:6]:
                f_clean = f"[Key Formula/Def] {f}"
                f_rect = fitz.Rect(40, y, 555, y + 20)
                page.insert_textbox(f_rect, f_clean, fontsize=9.5, fontname="helv", color=(0.15, 0.18, 0.22))
                y += 20

        # Footer
        footer_rect = fitz.Rect(0, 810, 595, 842)
        page.draw_rect(footer_rect, color=None, fill=(0.96, 0.97, 0.98))
        page.insert_text((40, 828), "ClassAbly Academic Intelligence Platform — Verified Lecture Artifact", fontsize=8, fontname="helv", color=(0.5, 0.55, 0.6))
        page.insert_text((480, 828), "Page 1 of 1", fontsize=8, fontname="helv", color=(0.5, 0.55, 0.6))

        pdf_bytes = doc.tobytes(deflate=True)
        doc.close()
        return pdf_bytes


export_service = ExportService()
