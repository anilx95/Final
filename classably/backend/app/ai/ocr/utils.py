"""
OCR Helper Utilities
"""

import re
from typing import List, Dict, Any


def clean_ocr_text(text: str) -> str:
    """Removes noise, non-printable characters, and normalizes spaces."""
    if not text:
        return ""
    text = re.sub(r"[\r\n\t]+", " ", text)
    text = re.sub(r"[^\x20-\x7E]", "", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def extract_bounding_boxes(detection_results: List[Any]) -> List[Dict[str, Any]]:
    """Extracts bounding box coordinates and recognized text from OCR outputs."""
    boxes = []
    if not detection_results:
        return boxes
    for res in detection_results:
        if not res:
            continue
        for line in res:
            if not line or len(line) < 2:
                continue
            bbox = line[0]
            text_conf = line[1]
            boxes.append(
                {
                    "bbox": bbox,
                    "text": clean_ocr_text(text_conf[0]) if len(text_conf) > 0 else "",
                    "confidence": float(text_conf[1]) if len(text_conf) > 1 else 0.0,
                }
            )
    return boxes
