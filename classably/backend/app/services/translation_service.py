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

# Offline fallback dictionary for common educational & classroom phrases across supported languages
_FALLBACK_DICTIONARY: dict[str, dict[str, str]] = {
    "hi": {
        "hello": "नमस्ते",
        "hi": "नमस्ते",
        "welcome": "स्वागत है",
        "welcome to class": "कक्षा में आपका स्वागत है",
        "welcome to the class": "कक्षा में आपका स्वागत है",
        "hello welcome to class": "नमस्ते कक्षा में आपका स्वागत है",
        "lecture": "व्याख्यान",
        "smart classroom": "स्मार्ट कक्षा",
        "class": "कक्षा",
        "classroom": "कक्षा",
        "student": "छात्र",
        "students": "छात्रों",
        "teacher": "अध्यापक",
        "educator": "शिक्षक",
        "artificial intelligence": "कृत्रिम बुद्धिमत्ता",
        "machine learning": "मशीन लर्निंग",
        "deep learning": "डीप लर्निंग",
        "deep neural networks": "डीप न्यूरल नेटवर्क",
        "neural networks": "न्यूरल नेटवर्क",
        "board ocr recognition": "बोर्ड ओसीआर पहचान",
        "speech to text": "स्पीच टू टेक्स्ट",
        "subtitles": "उपशीर्षक",
        "next topic": "अगला विषय",
        "today we will learn": "आज हम सीखेंगे",
        "today's topic": "आज का विषय",
        "good morning": "सुप्रभात",
        "good afternoon": "शुभ दोपहर",
        "good evening": "शुभ संध्या",
        "let us begin": "आइए शुरू करते हैं",
        "let's begin": "आइए शुरू करते हैं",
        "let us start": "आइए शुरू करते हैं",
        "let's start": "आइए शुरू करते हैं",
        "any questions": "कोई प्रश्न",
        "do you have any questions": "क्या आपका कोई प्रश्न है",
        "is this clear": "क्या यह स्पष्ट है",
        "please pay attention": "कृपया ध्यान दें",
        "listen carefully": "ध्यान से सुनें",
        "convolutional layer filters": "कन्वोल्यूशनल लेयर फ़िल्टर",
        "question": "प्रश्न",
        "answer": "उत्तर",
        "doubt": "संदेह",
        "hand raised": "हाथ उठाया",
        "accessibility": "सुगमता",
        "mathematics": "गणित",
        "physics": "भौतिकी",
        "chemistry": "रसायन विज्ञान",
        "biology": "जीव विज्ञान",
        "computer science": "कंप्यूटर विज्ञान",
        "overview of core principles": "मूल सिद्धांतों का अवलोकन",
        "step by step formula derivation": "चरण दर चरण सूत्र व्युत्पत्ति",
        "real world applications": "वास्तविक दुनिया के अनुप्रयोग",
        "thank you": "धन्यवाद",
        "thank you very much": "बहुत-बहुत धन्यवाद",
        "class dismissed": "कक्षा समाप्त",
    },
    "te": {
        "hello": "నమస్కారం",
        "hi": "నమస్కారం",
        "welcome": "స్వాగతం",
        "welcome to class": "తరగతికి స్వాగతం",
        "welcome to the class": "తరగతికి స్వాగతం",
        "hello welcome to class": "హలో తరగతికి స్వాగతం",
        "lecture": "పాఠం",
        "smart classroom": "స్మార్ట్ తరగతి గది",
        "class": "తరగతి",
        "classroom": "తరగతి గది",
        "student": "విద్యార్థి",
        "students": "విద్యార్థులు",
        "teacher": "ఉపాధ్యాయుడు",
        "educator": "బోధకుడు",
        "artificial intelligence": "కృత్రిమ మేధస్సు",
        "machine learning": "మెషిన్ లెర్నింగ్",
        "deep learning": "డీప్ లెర్నింగ్",
        "deep neural networks": "డీప్ న్యూరల్ నెట్‌వర్క్‌లు",
        "neural networks": "న్యూరల్ నెట్‌వర్క్‌లు",
        "board ocr recognition": "బోర్డు ఓసిఆర్ గుర్తింపు",
        "speech to text": "స్పీచ్ టు టెక్స్ట్",
        "subtitles": "శీర్షికలు",
        "next topic": "తదుపరి అంశం",
        "today we will learn": "ఈరోజు మనం నేర్చుకుంటాము",
        "today's topic": "ఈనాటి అంశం",
        "good morning": "శుభోదయం",
        "good afternoon": "శుభ మధ్యాహ్నం",
        "good evening": "శుభ సాయంత్రం",
        "let us begin": "మనం ప్రారంభిద్దాం",
        "let's begin": "మనం ప్రారంభిద్దాం",
        "let us start": "మనం ప్రారంభిద్దాం",
        "let's start": "మనం ప్రారంభిద్దాం",
        "any questions": "ఏవైనా ప్రశ్నలు ఉన్నాయా",
        "do you have any questions": "మీకు ఏవైనా ప్రశ్నలు ఉన్నాయా",
        "is this clear": "ఇది అర్థమైందా",
        "please pay attention": "దయచేసి శ్రద్ధ వహించండి",
        "listen carefully": "జాగ్రత్తగా వినండి",
        "convolutional layer filters": "కన్వోల్యూషనల్ లేయర్ ఫిల్టర్లు",
        "question": "ప్రశ్న",
        "answer": "సమాధానం",
        "doubt": "సందేహం",
        "hand raised": "చెయ్యి పైకెత్తారు",
        "accessibility": "సౌలభ్యం",
        "mathematics": "గణితం",
        "physics": "భౌతికశాస్త్రం",
        "chemistry": "రసాయనశాస్త్రం",
        "biology": "జీవశాస్త్రం",
        "computer science": "కంప్యూటర్ సైన్స్",
        "overview of core principles": "ముఖ్య సూత్రాల అవలోకనం",
        "step by step formula derivation": "దశలవారీ ఫార్ములా ఉత్పాదన",
        "real world applications": "రియల్ వరల్డ్ అప్లికేషన్లు",
        "thank you": "ధన్యవాదాలు",
        "thank you very much": "చాలా ధన్యవాదాలు",
        "class dismissed": "తరగతి పూర్తయింది",
    },
    "ta": {
        "hello": "வணக்கம்",
        "hi": "வணக்கம்",
        "welcome": "வரவேற்கிறோம்",
        "welcome to class": "வகுப்பிற்கு வரவேற்கிறோம்",
        "lecture": "விரிவுரை",
        "class": "வகுப்பு",
        "student": "மாணவர்",
        "teacher": "ஆசிரியர்",
        "today we will learn": "இன்று நாம் கற்போம்",
        "thank you": "நன்றி",
        "artificial intelligence": "செயற்கை நுண்ணறிவு",
        "machine learning": "இயந்திர கற்றல்",
    },
    "es": {
        "hello": "Hola",
        "welcome": "Bienvenido",
        "welcome to class": "Bienvenidos a clase",
        "lecture": "Conferencia",
        "class": "Clase",
        "student": "Estudiante",
        "teacher": "Profesor",
        "today we will learn": "Hoy aprenderemos",
        "thank you": "Gracias",
        "artificial intelligence": "Inteligencia Artificial",
    },
    "fr": {
        "hello": "Bonjour",
        "welcome": "Bienvenue",
        "welcome to class": "Bienvenue en classe",
        "lecture": "Cours",
        "class": "Classe",
        "student": "Étudiant",
        "teacher": "Enseignant",
        "today we will learn": "Aujourd'hui nous allons apprendre",
        "thank you": "Merci",
        "artificial intelligence": "Intelligence Artificielle",
    },
    "de": {
        "hello": "Hallo",
        "welcome": "Willkommen",
        "welcome to class": "Willkommen im Unterricht",
        "lecture": "Vorlesung",
        "class": "Klasse",
        "student": "Student",
        "teacher": "Lehrer",
        "today we will learn": "Heute lernen wir",
        "thank you": "Danke",
        "artificial intelligence": "Künstliche Intelligenz",
    },
}


class TranslationService:
    @staticmethod
    def _is_valid_translation(result: str, original: str) -> bool:
        if not result or not result.strip():
            return False
        r = result.strip().lower()
        if (
            "error 500" in r
            or "<html" in r
            or "<!doctype" in r
            or "that’s an error" in r
            or "that's an error" in r
            or "invalid source language" in r
            or "mymemory warning" in r
            or "too many requests" in r
            or "quota exceeded" in r
        ):
            return False
        return True

    @staticmethod
    def translate_via_http(text: str, target_code: str) -> str:
        """Direct Google Translate free REST API endpoint with resilient timeout."""
        try:
            encoded_text = urllib.parse.quote(text)
            url = f"https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl={target_code}&dt=t&q={encoded_text}"
            req = urllib.request.Request(
                url,
                headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"}
            )
            with urllib.request.urlopen(req, timeout=2.5) as response:
                raw = response.read().decode("utf-8")
                if raw.strip().startswith("["):
                    payload = json.loads(raw)
                    if payload and len(payload) > 0 and payload[0]:
                        translated_segments = [item[0] for item in payload[0] if item and len(item) > 0 and item[0]]
                        result = "".join(translated_segments).strip()
                        if TranslationService._is_valid_translation(result, text):
                            return result
        except Exception as e:
            logger.debug(f"Direct Google Translate API fallback notice: {e}")
        return ""

    @staticmethod
    def translate_via_mymemory(text: str, target_code: str, source_code: str = "en") -> str:
        """MyMemory Translation fallback API with proper source language."""
        try:
            encoded_text = urllib.parse.quote(text)
            src = source_code or "en"
            url = f"https://api.mymemory.translated.net/get?q={encoded_text}&langpair={src}|{target_code}"
            req = urllib.request.Request(
                url,
                headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
            )
            with urllib.request.urlopen(req, timeout=3.0) as response:
                data = json.loads(response.read().decode("utf-8"))
                result = (data.get("responseData", {}) or {}).get("translatedText", "")
                if TranslationService._is_valid_translation(result, text):
                    return result
        except Exception as e:
            logger.debug(f"MyMemory translation API notice: {e}")
        return ""

    @staticmethod
    def translate_via_dictionary(text: str, target_code: str) -> str:
        """Fallback offline dictionary lookup with phrase-level matching."""
        dict_map = _FALLBACK_DICTIONARY.get(target_code, {})
        if not dict_map:
            return text
        lowered = text.lower().strip()
        if lowered in dict_map:
            return dict_map[lowered]

        # Multi-word phrase matching
        draft = lowered
        matched = False
        sorted_phrases = sorted(dict_map.keys(), key=len, reverse=True)
        for phrase in sorted_phrases:
            if phrase in draft:
                draft = draft.replace(phrase, dict_map[phrase])
                matched = True
        if matched and draft != lowered:
            return draft
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

        # Tier 1: Check fast local dictionary lookup first for exact match
        dict_map = _FALLBACK_DICTIONARY.get(target_code, {})
        lowered = text_str.lower().strip()
        if lowered in dict_map:
            res = dict_map[lowered]
            _translation_cache[cache_key] = res
            return res

        # Tier 2: Direct HTTP request to Google Translate API
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
                translated = GoogleTranslator(source="en", target=target_code).translate(text_str)
                if cls._is_valid_translation(translated, text_str):
                    _translation_cache[cache_key] = translated.strip()
                    return translated.strip()
            except Exception as e:
                logger.debug(f"deep-translator skipped for '{text_str[:20]}': {e}")

        # Tier 4: MyMemory Translation API with explicit en source
        try:
            translated_mm = cls.translate_via_mymemory(text_str, target_code, source_code="en")
            if translated_mm:
                _translation_cache[cache_key] = translated_mm
                return translated_mm
        except Exception:
            pass

        # Tier 5: Phrase-level dictionary fallback
        phrase_fallback = cls.translate_via_dictionary(text_str, target_code)
        if phrase_fallback != text_str:
            _translation_cache[cache_key] = phrase_fallback
            return phrase_fallback

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


