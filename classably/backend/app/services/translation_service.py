import logging
import json
import urllib.request
import urllib.parse

logger = logging.getLogger(__name__)

try:
    from deep_translator import GoogleTranslator
    HAS_TRANSLATOR = True
except ImportError:
    HAS_TRANSLATOR = False
    logger.warning("deep-translator not installed, will use direct API and dictionary fallbacks.")

# In-memory translation cache to prevent repetitive API calls
_translation_cache: dict[tuple[str, str], str] = {}

# Offline fallback dictionary for common educational & classroom phrases
_FALLBACK_DICTIONARY = {
    "hi": {
        "hello": "नमस्ते",
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
    }
}


class TranslationService:
    @staticmethod
    def translate_via_http(text: str, target_code: str) -> str:
        """Direct Google Translate free REST API endpoint with resilient timeout."""
        try:
            encoded_text = urllib.parse.quote(text)
            url = f"https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl={target_code}&dt=t&q={encoded_text}"
            req = urllib.request.Request(
                url,
                headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
            )
            with urllib.request.urlopen(req, timeout=2.5) as response:
                payload = json.loads(response.read().decode("utf-8"))
                if payload and len(payload) > 0 and payload[0]:
                    translated_segments = [item[0] for item in payload[0] if item and len(item) > 0 and item[0]]
                    result = "".join(translated_segments).strip()
                    if result:
                        return result
        except Exception as e:
            logger.debug(f"Direct Google Translate API fallback notice: {e}")
        return ""

    @staticmethod
    def translate_via_dictionary(text: str, target_code: str) -> str:
        """Fallback offline translation using exact match in local dictionary."""
        dict_map = _FALLBACK_DICTIONARY.get(target_code, {})
        lowered = text.lower().strip()
        if lowered in dict_map:
            return dict_map[lowered]
        return text

    @classmethod
    def translate(cls, text: str, target_lang: str) -> str:
        text_str = (text or "").strip()
        if not text_str:
            return ""

        # Default / English -> return as is
        if not target_lang or target_lang.lower() in ("en", "english"):
            return text_str

        lang_code = target_lang.strip()
        lower_code = lang_code.lower()
        if lower_code in ("hi", "hindi"):
            target_code = "hi"
        elif lower_code in ("te", "telugu"):
            target_code = "te"
        elif lower_code in ("ta", "tamil"):
            target_code = "ta"
        elif lower_code in ("kn", "kannada"):
            target_code = "kn"
        elif lower_code in ("ml", "malayalam"):
            target_code = "ml"
        elif lower_code in ("mr", "marathi"):
            target_code = "mr"
        elif lower_code in ("bn", "bengali"):
            target_code = "bn"
        elif lower_code in ("gu", "gujarati"):
            target_code = "gu"
        elif lower_code in ("pa", "punjabi"):
            target_code = "pa"
        elif lower_code in ("ur", "urdu"):
            target_code = "ur"
        elif lower_code in ("es", "spanish"):
            target_code = "es"
        elif lower_code in ("fr", "french"):
            target_code = "fr"
        elif lower_code in ("de", "german"):
            target_code = "de"
        elif lower_code in ("ja", "japanese"):
            target_code = "ja"
        elif lower_code in ("ko", "korean"):
            target_code = "ko"
        elif lower_code in ("zh-cn", "zh_cn", "chinese (simplified)"):
            target_code = "zh-CN"
        elif lower_code in ("zh-tw", "zh_tw", "chinese (traditional)"):
            target_code = "zh-TW"
        elif lower_code in ("ar", "arabic"):
            target_code = "ar"
        elif lower_code in ("ru", "russian"):
            target_code = "ru"
        else:
            target_code = lang_code

        cache_key = (text_str, target_code)
        if cache_key in _translation_cache:
            return _translation_cache[cache_key]

        # Tier 1: Check fast local dictionary lookup first for instant response
        translated_dict = cls.translate_via_dictionary(text_str, target_code)
        if translated_dict != text_str:
            _translation_cache[cache_key] = translated_dict
            return translated_dict

        # Tier 2: Direct HTTP request to Google Translate API with 2.5s timeout
        try:
            translated_http = cls.translate_via_http(text_str, target_code)
            if translated_http:
                _translation_cache[cache_key] = translated_http
                return translated_http
        except Exception:
            pass

        # Tier 3: deep-translator with fast fallback
        if HAS_TRANSLATOR:
            try:
                translated = GoogleTranslator(source="auto", target=target_code).translate(text_str)
                if translated and translated.strip():
                    _translation_cache[cache_key] = translated.strip()
                    return translated.strip()
            except Exception as e:
                logger.debug(f"deep-translator skipped for '{text_str[:20]}': {e}")

        _translation_cache[cache_key] = text_str
        return text_str

    @classmethod
    def get_all_translations(cls, text: str, extra_langs: list[str] = None) -> dict[str, str]:
        """Pre-compute common translations for real-time WebSocket subtitle payloads."""
        clean = (text or "").strip()
        if not clean:
            return {"en": "", "hi": "", "te": ""}
        
        langs_to_compute = ["hi", "te"]
        if extra_langs:
            for l in extra_langs:
                if l and l != "en" and l not in langs_to_compute:
                    langs_to_compute.append(l)

        results = {"en": clean}
        for lang in langs_to_compute:
            try:
                results[lang] = cls.translate(clean, lang)
            except Exception:
                results[lang] = clean

        return results


translation_service = TranslationService()


