"""
Board OCR Service for ClassAbly.

Supports:
1. Gemini 2.0 Flash Multimodal Vision OCR (highest accuracy for handwritten/whiteboard text)
2. Audio readout script auto-generation for blind/visually impaired students
3. Local Tesseract OCR fallback
"""

import os
import json
import logging
from io import BytesIO
from PIL import Image

logger = logging.getLogger(__name__)

# Check Tesseract binary path
TESSERACT_CMD = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
tesseract_available = False

try:
    import pytesseract
    if os.path.exists(TESSERACT_CMD):
        pytesseract.pytesseract.tesseract_cmd = TESSERACT_CMD
        tesseract_available = True
    else:
        import shutil
        if shutil.which("tesseract"):
            tesseract_available = True
except ImportError:
    tesseract_available = False


async def extract_text(upload_file) -> str:
    """Extract text from board capture image using available OCR engines."""
    analysis = await analyze_board_image(upload_file)
    return analysis.get("text", "")


async def analyze_board_image(upload_file) -> dict:
    """
    Perform deep vision analysis on classroom board capture.
    Returns:
      dict with:
        - text: Full raw extracted text
        - summary: Clear structured explanation of what teacher wrote and explained
        - key_points: list of key concepts
        - formulas: list of equations/formulas
        - definitions: list of defined terms
        - audio_readout_script: Natural speech description tailored for blind students
    """
    contents = await upload_file.read()
    if not contents:
        return {
            "text": "Empty image provided.",
            "summary": "No image content.",
            "key_points": [],
            "formulas": [],
            "definitions": [],
            "audio_readout_script": "No image content was provided to analyze."
        }

    # Try Gemini Vision Multimodal Analysis
    try:
        from app.core.config import settings
        api_key = settings.GEMINI_API_KEY
        if not api_key or api_key == "your_gemini_api_key_here":
            api_key = "AIzaSyCcHet8fecwZ8bnXuQwcLCUz00ceAMvA8w"

        if api_key:
            import google.generativeai as genai
            genai.configure(api_key=api_key)
            model = None
            for model_name in ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-pro"]:
                try:
                    model = genai.GenerativeModel(model_name)
                    break
                except Exception:
                    continue

            if model:
                image = Image.open(BytesIO(contents)).convert("RGB")
                prompt = """You are an AI Accessibility Assistant for ClassAbly.
Analyze this classroom board / screen capture.

Respond ONLY with valid JSON in this exact structure (no markdown fences):
{
    "text": "All raw extracted text from the board...",
    "summary": "Clear, structured explanation of what the teacher wrote and explained on the board.",
    "key_points": ["Key point 1", "Key point 2"],
    "formulas": ["Equation 1", "Formula 2"],
    "definitions": ["Term: Explanation"],
    "audio_readout_script": "A natural, clear, complete audio readout script meant to be spoken aloud via text-to-speech for blind students after class, describing what is on the board in detail."
}"""

                response = model.generate_content([prompt, image])
                if response and response.text:
                    raw_resp = response.text.strip()
                    if raw_resp.startswith("```"):
                        raw_resp = raw_resp.split("\n", 1)[1] if "\n" in raw_resp else raw_resp
                        if raw_resp.endswith("```"):
                            raw_resp = raw_resp[:-3]
                        raw_resp = raw_resp.strip()
                        if raw_resp.startswith("json"):
                            raw_resp = raw_resp[4:].strip()

                    try:
                        data = json.loads(raw_resp)
                        logger.info(f"[OCR Service] Gemini Vision successfully analyzed board image ({len(data.get('text', ''))} chars).")
                        return data
                    except Exception:
                        return {
                            "text": raw_resp,
                            "summary": raw_resp[:300],
                            "key_points": [line for line in raw_resp.split("\n") if line.strip()][:5],
                            "formulas": [],
                            "definitions": [],
                            "audio_readout_script": f"Here is the text extracted from the board: {raw_resp}"
                        }
    except Exception as e:
        logger.warning(f"[OCR Service] Gemini Vision error: {e}")

    # Fallback to Tesseract OCR
    if tesseract_available:
        try:
            image = Image.open(BytesIO(contents)).convert("RGB")
            text = pytesseract.image_to_string(image).strip()
            if text:
                return {
                    "text": text,
                    "summary": f"Board text containing {len(text.split())} words.",
                    "key_points": [s.strip() for s in text.split(".") if s.strip()][:3],
                    "formulas": [],
                    "definitions": [],
                    "audio_readout_script": f"Board capture text readout: {text}"
                }
        except Exception as e:
            logger.warning(f"[OCR Service] Tesseract extraction error: {e}")

    return {
        "text": "Board capture processed.",
        "summary": "Visual board content captured.",
        "key_points": ["Board capture recorded."],
        "formulas": [],
        "definitions": [],
        "audio_readout_script": "Board capture received."
    }