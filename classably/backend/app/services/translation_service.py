import logging
import json
import urllib.parse
from typing import Optional
import httpx

logger = logging.getLogger(__name__)

# Global persistent AsyncClient for ultra-fast non-blocking HTTP connection reuse
_HTTPX_CLIENT: Optional[httpx.AsyncClient] = None


def get_httpx_client() -> httpx.AsyncClient:
    global _HTTPX_CLIENT
    if _HTTPX_CLIENT is None or _HTTPX_CLIENT.is_closed:
        _HTTPX_CLIENT = httpx.AsyncClient(
            timeout=3.0,
            limits=httpx.Limits(max_keepalive_connections=50, max_connections=100),
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"},
        )
    return _HTTPX_CLIENT


# In-memory translation cache to prevent repetitive API calls
_translation_cache: dict[tuple[str, str], str] = {}

# Offline fallback dictionary for common educational & classroom phrases
_FALLBACK_DICTIONARY = {
    "hi": {
        "hello": "नमस्ते",
        "welcome": "स्वागत है",
        "welcome to class": "कक्षा में आपका स्वागत है",
        "hello welcome to class": "नमस्ते कक्षा में आपका स्वागत है",
        "lecture": "व्याख्यान",
        "smart classroom": "स्मार्ट कक्षा",
        "artificial intelligence": "कृत्रिम बुद्धिमत्ता",
        "machine learning": "मशीन लर्निंग",
        "deep neural networks": "डीप न्यूरल नेटवर्क",
        "board ocr recognition": "बोर्ड ओसीआर पहचान",
        "speech to text": "स्पीच टू टेक्स्ट",
        "subtitles": "उपशीर्षक",
        "next topic": "अगला विषय",
        "today we will learn": "आज हम सीखेंगे",
        "good morning": "सुप्रभात",
        "good afternoon": "शुभ दोपहर",
        "let us begin": "आइए शुरू करते हैं",
        "any questions": "कोई प्रश्न",
        "please pay attention": "कृपया ध्यान दें",
        "convolutional layer filters": "कन्वोल्यूशनल लेयर फ़िल्टर",
        "question": "प्रश्न",
        "doubt": "संदेह",
        "hand raised": "हाथ उठाया",
        "accessibility": "सुगमता",
        "overview of core principles": "मूल सिद्धांतों का अवलोकन",
        "step by step formula derivation": "चरण दर चरण सूत्र व्युत्पत्ति",
        "real world applications": "वास्तविक दुनिया के अनुप्रयोग",
        "thank you": "धन्यवाद",
        "class dismissed": "कक्षा समाप्त",
    },
    "te": {
        "hello": "హలో",
        "welcome": "స్వాగతం",
        "welcome to class": "క్లాస్‌కి స్వాగతం",
        "hello welcome to class": "హలో క్లాస్‌కి స్వాగతం",
        "lecture": "పాఠం",
        "smart classroom": "స్మార్ట్ తరగతి గది",
        "artificial intelligence": "కృత్రిమ మేధస్సు",
        "machine learning": "మెషిన్ లెర్నింగ్",
        "deep neural networks": "డీప్ న్యూరల్ నెట్‌వర్క్‌లు",
        "board ocr recognition": "బోర్డు ఓసిఆర్ గుర్తింపు",
        "speech to text": "స్పీచ్ టు టెక్స్ట్",
        "subtitles": "శీర్షికలు",
        "next topic": "తదుపరి అంశం",
        "today we will learn": "ఈరోజు మనం నేర్చుకుంటాము",
        "good morning": "శుభోదయం",
        "good afternoon": "శుభ మధ్యాహ్నం",
        "let us begin": "మనం ప్రారంభిద్దాం",
        "any questions": "ఏవైనా ప్రశ్నలు ఉన్నాయా",
        "please pay attention": "దయచేసి శ్రద్ధ వహించండి",
        "convolutional layer filters": "కన్వోల్యూషనల్ లేయర్ ఫిల్టర్లు",
        "question": "ప్రశ్న",
        "doubt": "సందేహం",
        "hand raised": "చెయ్యి పైకెత్తారు",
        "accessibility": "సౌలభ్యం",
        "overview of core principles": "ముఖ్య సూత్రాల అవలోకనం",
        "step by step formula derivation": "దశలవారీ ఫార్ములా ఉత్పాదన",
        "real world applications": "రియల్ వరల్డ్ అప్లికేషన్లు",
        "thank you": "ధన్యవాదాలు",
        "class dismissed": "తరగతి పూర్తయింది",
    },
    "ta": {
        "hello": "வணக்கம்",
        "welcome": "வரவேற்கிறோம்",
        "welcome to class": "வகுப்பிற்கு வரவேற்கிறோம்",
        "good morning": "காலை வணக்கம்",
        "let us begin": "தொடங்குவோம்",
        "today we will learn": "இன்று நாம் கற்போம்",
        "lecture": "விரிவுரை",
        "smart classroom": "ஸ்மார்ட் வகுப்பறை",
        "artificial intelligence": "செயற்கை நுண்ணறிவு",
        "thank you": "நன்றி",
    },
}

_LANG_MAP = {
    "hindi": "hi",
    "telugu": "te",
    "tamil": "ta",
    "kannada": "kn",
    "malayalam": "ml",
    "marathi": "mr",
    "bengali": "bn",
    "gujarati": "gu",
    "punjabi": "pa",
    "urdu": "ur",
    "spanish": "es",
    "french": "fr",
    "german": "de",
    "japanese": "ja",
    "korean": "ko",
    "chinese (simplified)": "zh-CN",
    "chinese (traditional)": "zh-TW",
    "arabic": "ar",
    "russian": "ru",
}


def normalize_code(lang: str) -> str:
    clean = (lang or "").strip()
    lower = clean.lower()
    if lower in _LANG_MAP:
        return _LANG_MAP[lower]
    if lower in ("zh-cn", "zh_cn"):
        return "zh-CN"
    if lower in ("zh-tw", "zh_tw"):
        return "zh-TW"
    return clean


class TranslationService:
    @classmethod
    async def translate_async(cls, text: str, target_lang: str) -> str:
        """High-speed async translation via connection-pooled HTTP client."""
        text_str = (text or "").strip()
        if not text_str:
            return ""

        if not target_lang or target_lang.lower() in ("en", "english"):
            return text_str

        target_code = normalize_code(target_lang)
        cache_key = (text_str.lower(), target_code)

        if cache_key in _translation_cache:
            return _translation_cache[cache_key]

        # 1. Fast in-memory dictionary lookup (0ms)
        dict_map = _FALLBACK_DICTIONARY.get(target_code, {})
        lowered = text_str.lower()
        if lowered in dict_map:
            res = dict_map[lowered]
            _translation_cache[cache_key] = res
            return res

        # 2. Async Google Translate REST API via client=dict-chrome-ex and gtx (20ms - 40ms)
        try:
            client = get_httpx_client()
            encoded_text = urllib.parse.quote(text_str)
            for client_type in ("dict-chrome-ex", "gtx"):
                try:
                    url = f"https://translate.googleapis.com/translate_a/single?client={client_type}&sl=auto&tl={target_code}&dt=t&q={encoded_text}"
                    resp = await client.get(url)
                    if resp.status_code == 200:
                        payload = resp.json()
                        if payload and len(payload) > 0 and payload[0]:
                            translated_segments = [item[0] for item in payload[0] if item and len(item) > 0 and item[0]]
                            result = "".join(translated_segments).strip()
                            if result and result.lower() != text_str.lower():
                                _translation_cache[cache_key] = result
                                return result
                except Exception:
                    continue
        except Exception as e:
            logger.debug(f"[TranslationService] Google API error: {e}")

        # 3. Fallback to MyMemory translation API (50ms - 80ms)
        try:
            client = get_httpx_client()
            encoded_text = urllib.parse.quote(text_str)
            mm_url = f"https://api.mymemory.translated.net/get?q={encoded_text}&langpair=en|{target_code}"
            mm_resp = await client.get(mm_url)
            if mm_resp.status_code == 200:
                mm_data = mm_resp.json()
                translated = mm_data.get("responseData", {}).get("translatedText", "").strip()
                if translated and translated.lower() != text_str.lower() and "MYMEMORY WARNING" not in translated:
                    _translation_cache[cache_key] = translated
                    return translated
        except Exception as e:
            logger.debug(f"[TranslationService] MyMemory API error: {e}")

        # If translation fails, do NOT pollute cache with English
        return ""

    @classmethod
    def translate(cls, text: str, target_lang: str) -> str:
        """Synchronous wrapper for legacy code."""
        text_str = (text or "").strip()
        if not text_str or not target_lang or target_lang.lower() in ("en", "english"):
            return text_str

        target_code = normalize_code(target_lang)
        cache_key = (text_str.lower(), target_code)
        if cache_key in _translation_cache:
            return _translation_cache[cache_key]

        # Fast dictionary
        dict_map = _FALLBACK_DICTIONARY.get(target_code, {})
        if text_str.lower() in dict_map:
            return dict_map[text_str.lower()]

        # Synchronous httpx fallback
        try:
            with httpx.Client(timeout=2.0) as client:
                encoded_text = urllib.parse.quote(text_str)
                url = f"https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl={target_code}&dt=t&q={encoded_text}"
                resp = client.get(url)
                if resp.status_code == 200:
                    payload = resp.json()
                    if payload and len(payload) > 0 and payload[0]:
                        segments = [item[0] for item in payload[0] if item and len(item) > 0 and item[0]]
                        result = "".join(segments).strip()
                        if result:
                            _translation_cache[cache_key] = result
                            return result
        except Exception:
            pass

        return text_str

    @classmethod
    def get_all_translations(cls, text: str, extra_langs: list[str] = None) -> dict[str, str]:
        clean = (text or "").strip()
        if not clean:
            return {"en": ""}
        results = {"en": clean}
        for lang in (extra_langs or ["hi", "te", "ta", "mr", "bn", "es", "fr"]):
            res = cls.translate(clean, lang)
            if res and res != clean:
                results[lang] = res
        return results


translation_service = TranslationService()


