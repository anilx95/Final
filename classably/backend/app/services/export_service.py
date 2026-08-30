import os
import re
import fitz  # PyMuPDF
from typing import Dict, Any, List, Optional
from datetime import datetime


class ExportService:
    @staticmethod
    def generate_txt(
        title: str,
        text_content: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> str:
        """Generate a clean, structured, UTF-8 plain text transcript document."""
        clean_title = (title or "Lecture Transcript").strip()
        lines = [
            "================================================================================",
            "CLASSABLY PLATFORM — OFFICIAL LECTURE TRANSCRIPT",
            "================================================================================",
            f"Title: {clean_title}",
        ]
        if metadata:
            for k, v in metadata.items():
                if v:
                    lines.append(f"{k}: {v}")
        lines.append("--------------------------------------------------------------------------------")
        lines.append("")
        lines.append(text_content.strip() if text_content else "No transcript entries recorded.")
        lines.append("")
        lines.append("--------------------------------------------------------------------------------")
        lines.append(f"Generated on: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}")
        lines.append("ClassAbly Accessible Learning Intelligence — All Rights Reserved.")
        lines.append("================================================================================")
        return "\n".join(lines)

    @staticmethod
    def generate_vtt(subtitles: list) -> str:
        vtt = "WEBVTT - ClassAbly Live Lecture Subtitles\n\n"
        for i, sub in enumerate(subtitles, 1):
            offset = sub.get("timestamp_offset", (i - 1) * 3.0) or 0.0
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
        definitions: Optional[List[str]] = None,
        formulas: Optional[List[str]] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> bytes:
        """
        Generate a valid, highly professional, multi-page aware A4 PDF summary document using PyMuPDF (fitz).
        Dynamically formats executive summary, takeaways, definitions, and equations across pages with headers & footers.
        """
        doc = fitz.open()

        PAGE_WIDTH = 595.0
        PAGE_HEIGHT = 842.0
        MARGIN_LEFT = 40.0
        MARGIN_RIGHT = 555.0
        CONTENT_WIDTH = MARGIN_RIGHT - MARGIN_LEFT  # 515 pt
        HEADER_HEIGHT = 70.0
        FOOTER_START = 790.0

        def create_page():
            page = doc.new_page(width=PAGE_WIDTH, height=PAGE_HEIGHT)
            # Top Banner Background
            header_rect = fitz.Rect(0, 0, PAGE_WIDTH, HEADER_HEIGHT)
            page.draw_rect(header_rect, color=None, fill=(0.06, 0.09, 0.16))  # Dark Slate #0f172a

            # Top Banner Title & Brand Subtitle
            page.insert_text(
                (MARGIN_LEFT, 32),
                "ClassAbly Smart Lecture Summary",
                fontsize=16,
                fontname="helv",
                color=(0.22, 0.74, 0.97),  # Sky blue #38bdf8
            )
            page.insert_text(
                (MARGIN_LEFT, 52),
                "AI-Generated Accessible Study Notes & Academic Artifact",
                fontsize=9.5,
                fontname="helv",
                color=(0.58, 0.64, 0.72),  # Slate #94a3b8
            )
            return page

        current_page = create_page()
        y = HEADER_HEIGHT + 24.0

        def check_space(needed_height: float):
            nonlocal current_page, y
            if y + needed_height > FOOTER_START:
                current_page = create_page()
                y = HEADER_HEIGHT + 24.0

        def sanitize_for_pdf(text: str) -> str:
            if not text:
                return ""
            # Normalize smart quotes, dashes, and bullet symbols
            t = str(text)
            t = t.replace("\u2014", "—").replace("\u2013", "–")
            t = t.replace("\u2018", "'").replace("\u2019", "'")
            t = t.replace("\u201c", '"').replace("\u201d", '"')
            t = t.replace("\u2022", "•")
            return t.strip()

        # 1. Main Lecture Title
        clean_title = sanitize_for_pdf(title) or "Lecture Summary"
        check_space(35.0)
        current_page.insert_text(
            (MARGIN_LEFT, y),
            clean_title[:80],
            fontsize=15,
            fontname="hebo",
            color=(0.06, 0.09, 0.16),
        )
        y += 20.0

        # 2. Metadata line
        if metadata:
            meta_items = [f"{k}: {v}" for k, v in metadata.items() if v]
            if meta_items:
                check_space(20.0)
                meta_str = "  |  ".join(meta_items)
                current_page.insert_text(
                    (MARGIN_LEFT, y),
                    sanitize_for_pdf(meta_str)[:110],
                    fontsize=8.5,
                    fontname="helv",
                    color=(0.4, 0.45, 0.55),
                )
                y += 16.0

        # Divider rule
        check_space(10.0)
        current_page.draw_line(
            fitz.Point(MARGIN_LEFT, y),
            fitz.Point(MARGIN_RIGHT, y),
            color=(0.85, 0.88, 0.92),
            width=0.8,
        )
        y += 14.0

        # 3. Section: Executive Summary
        check_space(30.0)
        current_page.draw_rect(
            fitz.Rect(MARGIN_LEFT, y - 13, MARGIN_RIGHT, y + 5),
            color=None,
            fill=(0.93, 0.96, 0.99),
        )
        current_page.insert_text(
            (MARGIN_LEFT + 6, y),
            "EXECUTIVE SUMMARY",
            fontsize=10.5,
            fontname="hebo",
            color=(0.08, 0.32, 0.65),
        )
        y += 16.0

        clean_summary = sanitize_for_pdf(summary) or "No lecture summary available for this session."
        paragraphs = [p.strip() for p in clean_summary.split("\n") if p.strip()]

        for p in paragraphs:
            # Estimate needed height for paragraph (approx 50-60 chars per line at 9.5pt)
            char_count = len(p)
            lines_est = max(1, (char_count // 70) + 1)
            box_height = lines_est * 13.0 + 8.0

            check_space(box_height)
            rect = fitz.Rect(MARGIN_LEFT, y, MARGIN_RIGHT, y + box_height)
            rc = current_page.insert_textbox(
                rect,
                p,
                fontsize=9.5,
                fontname="helv",
                color=(0.15, 0.18, 0.22),
            )
            # If text overflowed, move to next page and insert remainder
            if rc < 0:
                current_page = create_page()
                y = HEADER_HEIGHT + 24.0
                rect2 = fitz.Rect(MARGIN_LEFT, y, MARGIN_RIGHT, y + box_height + 20.0)
                current_page.insert_textbox(rect2, p, fontsize=9.5, fontname="helv", color=(0.15, 0.18, 0.22))
                y += box_height + 8.0
            else:
                y += box_height + 4.0

        # 4. Section: Key Takeaways & Highlights
        clean_kp = [sanitize_for_pdf(k) for k in (key_points or []) if k and str(k).strip()]
        if clean_kp:
            check_space(35.0)
            current_page.draw_rect(
                fitz.Rect(MARGIN_LEFT, y - 13, MARGIN_RIGHT, y + 5),
                color=None,
                fill=(0.93, 0.97, 0.94),
            )
            current_page.insert_text(
                (MARGIN_LEFT + 6, y),
                "KEY TAKEAWAYS & HIGHLIGHTS",
                fontsize=10.5,
                fontname="hebo",
                color=(0.06, 0.45, 0.25),
            )
            y += 18.0

            for kp in clean_kp:
                char_count = len(kp)
                lines_est = max(1, (char_count // 65) + 1)
                item_height = lines_est * 13.0 + 4.0

                check_space(item_height)
                # Bullet symbol
                current_page.insert_text(
                    (MARGIN_LEFT + 4, y + 10),
                    "•",
                    fontsize=12,
                    fontname="hebo",
                    color=(0.06, 0.55, 0.3),
                )
                kp_rect = fitz.Rect(MARGIN_LEFT + 16, y, MARGIN_RIGHT, y + item_height)
                current_page.insert_textbox(
                    kp_rect,
                    kp,
                    fontsize=9.0,
                    fontname="helv",
                    color=(0.15, 0.18, 0.22),
                )
                y += item_height + 2.0

        # 5. Section: Core Definitions & Key Terminology
        clean_defs = [sanitize_for_pdf(d) for d in (definitions or []) if d and str(d).strip()]
        if clean_defs:
            check_space(35.0)
            current_page.draw_rect(
                fitz.Rect(MARGIN_LEFT, y - 13, MARGIN_RIGHT, y + 5),
                color=None,
                fill=(0.95, 0.95, 0.99),
            )
            current_page.insert_text(
                (MARGIN_LEFT + 6, y),
                "CORE DEFINITIONS & TERMINOLOGY",
                fontsize=10.5,
                fontname="hebo",
                color=(0.35, 0.2, 0.65),
            )
            y += 18.0

            for defn in clean_defs:
                char_count = len(defn)
                lines_est = max(1, (char_count // 65) + 1)
                item_height = lines_est * 13.0 + 6.0

                check_space(item_height + 4.0)
                current_page.draw_rect(
                    fitz.Rect(MARGIN_LEFT, y, MARGIN_RIGHT, y + item_height),
                    color=(0.88, 0.88, 0.94),
                    fill=(0.98, 0.98, 1.0),
                    width=0.6,
                )
                def_rect = fitz.Rect(MARGIN_LEFT + 8, y + 2, MARGIN_RIGHT - 8, y + item_height)
                current_page.insert_textbox(
                    def_rect,
                    defn,
                    fontsize=9.0,
                    fontname="helv",
                    color=(0.15, 0.18, 0.25),
                )
                y += item_height + 6.0

        # 6. Section: Formulas & Equations
        clean_forms = [sanitize_for_pdf(f) for f in (formulas or []) if f and str(f).strip()]
        if clean_forms:
            check_space(35.0)
            current_page.draw_rect(
                fitz.Rect(MARGIN_LEFT, y - 13, MARGIN_RIGHT, y + 5),
                color=None,
                fill=(0.99, 0.96, 0.92),
            )
            current_page.insert_text(
                (MARGIN_LEFT + 6, y),
                "CORE DEFINITIONS & MATHEMATICAL FORMULAS",
                fontsize=10.5,
                fontname="hebo",
                color=(0.65, 0.35, 0.05),
            )
            y += 18.0

            for form in clean_forms:
                item_height = 24.0
                check_space(item_height + 4.0)
                current_page.draw_rect(
                    fitz.Rect(MARGIN_LEFT, y, MARGIN_RIGHT, y + item_height),
                    color=(0.95, 0.85, 0.7),
                    fill=(0.99, 0.97, 0.94),
                    width=0.6,
                )
                current_page.insert_text(
                    (MARGIN_LEFT + 10, y + 16),
                    f"[Formula]  {form}",
                    fontsize=9.5,
                    fontname="hebo",
                    color=(0.55, 0.25, 0.02),
                )
                y += item_height + 6.0

        # Draw footers on ALL pages with accurate total page count
        total_pages = len(doc)
        for page_idx in range(total_pages):
            p = doc[page_idx]
            footer_rect = fitz.Rect(0, FOOTER_START + 15, PAGE_WIDTH, PAGE_HEIGHT)
            p.draw_rect(footer_rect, color=None, fill=(0.97, 0.98, 0.99))
            p.draw_line(
                fitz.Point(0, FOOTER_START + 15),
                fitz.Point(PAGE_WIDTH, FOOTER_START + 15),
                color=(0.88, 0.9, 0.94),
                width=0.5,
            )
            p.insert_text(
                (MARGIN_LEFT, FOOTER_START + 32),
                "ClassAbly Academic Intelligence Platform — Verified Lecture Artifact",
                fontsize=8,
                fontname="helv",
                color=(0.5, 0.55, 0.6),
            )
            p.insert_text(
                (MARGIN_RIGHT - 55, FOOTER_START + 32),
                f"Page {page_idx + 1} of {total_pages}",
                fontsize=8,
                fontname="helv",
                color=(0.5, 0.55, 0.6),
            )

        pdf_bytes = doc.tobytes(deflate=True)
        doc.close()
        return pdf_bytes


export_service = ExportService()

