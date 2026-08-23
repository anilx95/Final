// Ultra-fast Client-side Translation Engine with Persistent Memory Cache, Token-level Streaming, and Rich Multilingual Dictionary
const IN_MEMORY_CACHE = new Map<string, string>();
const IN_FLIGHT_PROMISES = new Map<string, Promise<string>>();

// Initialize memory cache from localStorage if available
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    const savedCache = localStorage.getItem('classably_translation_cache_v2');
    if (savedCache) {
      const parsed = JSON.parse(savedCache);
      Object.entries(parsed).forEach(([k, v]) => {
        if (typeof v === 'string') IN_MEMORY_CACHE.set(k, v);
      });
    }
  }
} catch {
  // Ignore storage read errors
}

function persistCacheKey(key: string, value: string) {
  IN_MEMORY_CACHE.set(key, value);
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const existing = localStorage.getItem('classably_translation_cache_v2');
      const obj = existing ? JSON.parse(existing) : {};
      obj[key] = value;
      // Cap cache size to 2500 entries to prevent quota overflow
      const keys = Object.keys(obj);
      if (keys.length > 2500) {
        delete obj[keys[0]];
      }
      localStorage.setItem('classably_translation_cache_v2', JSON.stringify(obj));
    }
  } catch {
    // Ignore storage write errors
  }
}

// Rich offline dictionary for common educational terms across major languages
export const DICTIONARY: Record<string, Record<string, string>> = {
  hi: {
    "hello": "नमस्ते",
    "hi": "नमस्ते",
    "welcome": "स्वागत है",
    "welcome to class": "कक्षा में आपका स्वागत है",
    "welcome to the class": "कक्षा में आपका स्वागत है",
    "welcome students": "छात्रों का स्वागत है",
    "good morning": "सुप्रभात",
    "good afternoon": "शुभ दोपहर",
    "good evening": "शुभ संध्या",
    "let us begin": "आइए शुरू करते हैं",
    "let's begin": "आइए शुरू करते हैं",
    "let us start": "आइए शुरू करते हैं",
    "let's start": "आइए शुरू करते हैं",
    "start": "शुरू करें",
    "stop": "रोकें",
    "today we will learn": "आज हम सीखेंगे",
    "today's topic": "आज का विषय",
    "topic": "विषय",
    "chapter": "अध्याय",
    "lecture": "व्याख्यान",
    "smart classroom": "स्मार्ट कक्षा",
    "class": "कक्षा",
    "classroom": "कक्षा",
    "student": "छात्र",
    "students": "छात्रों",
    "teacher": "अध्यापक",
    "educator": "शिक्षक",
    "professor": "प्रोफेसर",
    "please pay attention": "कृपया ध्यान दें",
    "listen carefully": "ध्यान से सुनें",
    "look at the board": "बोर्ड पर देखें",
    "any questions": "कोई प्रश्न",
    "do you have any questions": "क्या आपका कोई प्रश्न है",
    "is this clear": "क्या यह स्पष्ट है",
    "yes": "हाँ",
    "no": "नहीं",
    "okay": "ठीक है",
    "ok": "ठीक है",
    "thank you": "धन्यवाद",
    "thank you very much": "बहुत-बहुत धन्यवाद",
    "class dismissed": "कक्षा समाप्त",
    "artificial intelligence": "कृत्रिम बुद्धिमत्ता",
    "machine learning": "मशीन लर्निंग",
    "deep learning": "डीप लर्निंग",
    "deep neural networks": "डीप न्यूरल नेटवर्क",
    "neural networks": "न्यूरल नेटवर्क",
    "computer science": "कंप्यूटर विज्ञान",
    "mathematics": "गणित",
    "physics": "भौतिकी",
    "chemistry": "रसायन विज्ञान",
    "biology": "जीव विज्ञान",
    "algorithm": "एल्गोरिदम",
    "data structures": "डेटा संरचनाएं",
    "database": "डेटाबेस",
    "network": "नेटवर्क",
    "question": "प्रश्न",
    "answer": "उत्तर",
    "doubt": "संदेह",
    "hand raised": "हाथ उठाया",
    "subtitles": "उपशीर्षक",
    "exam": "परीक्षा",
    "test": "परीक्षण",
    "assignment": "असाइनमेंट",
    "homework": "गृहकार्य",
    "notes": "नोट्स",
    "formula": "सूत्र",
    "example": "उदाहरण",
    "solution": "समाधान",
    "important": "महत्वपूर्ण",
    "next": "अगला",
    "previous": "पिछला",
  },
  te: {
    "hello": "నమస్కారం",
    "hi": "నమస్కారం",
    "welcome": "స్వాగతం",
    "welcome to class": "తరగతికి స్వాగతం",
    "welcome to the class": "తరగతికి స్వాగతం",
    "welcome students": "విద్యార్థులకు స్వాగతం",
    "good morning": "శుభోదయం",
    "good afternoon": "శుభ మధ్యాహ్నం",
    "good evening": "శుభ సాయంత్రం",
    "let us begin": "మనం ప్రారంభిద్దాం",
    "let's begin": "మనం ప్రారంభిద్దాం",
    "let us start": "మనం ప్రారంభిద్దాం",
    "let's start": "మనం ప్రారంభిద్దాం",
    "start": "ప్రారంభించండి",
    "stop": "ఆపండి",
    "today we will learn": "ఈరోజు మనం నేర్చుకుంటాము",
    "today's topic": "ఈనాటి అంశం",
    "topic": "అంశం",
    "chapter": "అధ్యాయం",
    "lecture": "పాఠం",
    "smart classroom": "స్మార్ట్ తరగతి గది",
    "class": "తరగతి",
    "classroom": "తరగతి గది",
    "student": "విద్యార్థి",
    "students": "విద్యార్థులు",
    "teacher": "ఉపాధ్యాయుడు",
    "educator": "బోధకుడు",
    "professor": "ఆచార్యుడు",
    "please pay attention": "దయచేసి శ్రద్ధ వహించండి",
    "listen carefully": "జాగ్రత్తగా వినండి",
    "look at the board": "బోర్డు వైపు చూడండి",
    "any questions": "ఏవైనా ప్రశ్నలు ఉన్నాయా",
    "do you have any questions": "మీకు ఏవైనా ప్రశ్నలు ఉన్నాయా",
    "is this clear": "ఇది అర్థమైందా",
    "yes": "అవును",
    "no": "కాదు",
    "okay": "సరే",
    "ok": "సరే",
    "thank you": "ధన్యవాదాలు",
    "thank you very much": "చాలా ధన్యవాదాలు",
    "class dismissed": "తరగతి పూర్తయింది",
    "artificial intelligence": "కృత్రిమ మేధస్సు",
    "machine learning": "మెషిన్ లెర్నింగ్",
    "deep learning": "డీప్ లెర్నింగ్",
    "deep neural networks": "డీప్ న్యూరల్ నెట్‌వర్క్‌లు",
    "neural networks": "న్యూరల్ నెట్‌వర్క్‌లు",
    "computer science": "కంప్యూటర్ సైన్స్",
    "mathematics": "గణితం",
    "physics": "భౌతికశాస్త్రం",
    "chemistry": "రసాయనశాస్త్రం",
    "biology": "జీవశాస్త్రం",
    "algorithm": "అల్గారిథమ్",
    "database": "డేటాబేస్",
    "network": "నెట్‌వర్క్",
    "question": "ప్రశ్న",
    "answer": "సమాధానం",
    "doubt": "సందేహం",
    "hand raised": "చేయి పైకెత్తారు",
    "subtitles": "శీర్షికలు",
    "exam": "పరీక్ష",
    "assignment": "అసైన్‌మెంట్",
    "notes": "నోట్స్",
    "formula": "సూత్రం",
    "example": "ఉదాహరణ",
    "solution": "పరిష్కారం",
    "important": "ముఖ్యమైనది",
  },
  ta: {
    "hello": "வணக்கம்",
    "hi": "வணக்கம்",
    "welcome": "வரவேற்கிறோம்",
    "welcome to class": "வகுப்பிற்கு வரவேற்கிறோம்",
    "welcome to the class": "வகுப்பிற்கு வரவேற்கிறோம்",
    "welcome students": "மாணவர்களுக்கு நல்வரவு",
    "good morning": "காலை வணக்கம்",
    "good afternoon": "மதிய வணக்கம்",
    "good evening": "மாலை வணக்கம்",
    "let us begin": "தொடங்குவோம்",
    "let's begin": "தொடங்குவோம்",
    "today we will learn": "இன்று நாம் கற்போம்",
    "today's topic": "இன்றைய தலைப்பு",
    "lecture": "விரிவுரை",
    "class": "வகுப்பு",
    "classroom": "வகுப்பறை",
    "student": "மாணவர்",
    "students": "மாணவர்கள்",
    "teacher": "ஆசிரியர்",
    "educator": "கல்வியாளர்",
    "professor": "பேராசிரியர்",
    "please pay attention": "தயவுசெய்து கவனியுங்கள்",
    "listen carefully": "கவனமாக கேளுங்கள்",
    "any questions": "ஏதேனும் கேள்விகள் உள்ளதா",
    "is this clear": "இது புரிகிறதா",
    "yes": "ஆம்",
    "no": "இல்லை",
    "okay": "சரி",
    "ok": "சரி",
    "thank you": "நன்றி",
    "thank you very much": "மிக்க நன்றி",
    "class dismissed": "வகுப்பு முடிந்தது",
    "artificial intelligence": "செயற்கை நுண்ணறிவு",
    "machine learning": "இயந்திர கற்றல்",
    "mathematics": "கணிதம்",
    "physics": "இயற்பியல்",
    "chemistry": "வேதியியல்",
    "biology": "உயிரியல்",
    "question": "கேள்வி",
    "answer": "பதில்",
    "subtitles": "துணைத்தலைப்புகள்",
  },
  kn: {
    "hello": "ನಮಸ್ಕಾರ",
    "hi": "ನಮಸ್ಕಾರ",
    "welcome": "ಸ್ವಾಗತ",
    "welcome to class": "ತರಗತಿಗೆ ಸ್ವಾಗತ",
    "good morning": "ಶುಭೋದಯ",
    "let us begin": "ಪ್ರಾರಂಭಿಸೋಣ",
    "today we will learn": "ಇಂದು ನಾವು ಕಲಿಯುತ್ತೇವೆ",
    "class": "ತರಗತಿ",
    "student": "ವಿದ್ಯಾರ್ಥಿ",
    "teacher": "ಶಿಕ್ಷಕ",
    "thank you": "ಧನ್ಯವಾದಗಳು",
    "artificial intelligence": "ಕೃತಕ ಬುದ್ಧಿಮತ್ತೆ",
    "mathematics": "ಗಣಿತ",
    "physics": "ಭೌತಶಾಸ್ತ್ರ",
    "chemistry": "ರಸಾಯನಶಾಸ್ತ್ರ",
  },
  ml: {
    "hello": "നമസ്കാരം",
    "hi": "നമസ്കാരം",
    "welcome": "സ്വാഗതം",
    "welcome to class": "ക്ലാസ്സിലേക്ക് സ്വാഗതം",
    "good morning": "സുപ്രഭാതം",
    "let us begin": "നമുക്ക് ആരംഭിക്കാം",
    "class": "ക്ലാസ്സ്",
    "student": "വിദ്യാർത്ഥി",
    "teacher": "അധ്യാപകൻ",
    "thank you": "നന്ദി",
    "mathematics": "ഗണിതം",
  },
  mr: {
    "hello": "नमस्कार",
    "hi": "नमस्कार",
    "welcome": "स्वागत आहे",
    "welcome to class": "वर्गात आपले स्वागत आहे",
    "good morning": "शुभ प्रभात",
    "let us begin": "सुरुवात करूया",
    "today we will learn": "आज आपण शिकणार आहोत",
    "class": "वर्ग",
    "student": "विद्यार्थी",
    "teacher": "शिक्षक",
    "thank you": "धन्यवाद",
    "artificial intelligence": "कृत्रिम बुद्धिमत्ता",
    "mathematics": "गणित",
    "physics": "भौतिकशास्त्र",
    "chemistry": "रसायनशास्त्र",
  },
  bn: {
    "hello": "হ্যালো / নমস্কার",
    "hi": "নমস্কার",
    "welcome": "স্বাগতম",
    "welcome to class": "ক্লাসে স্বাগতম",
    "good morning": "সুপ্রভাত",
    "let us begin": "আসুন শুরু করি",
    "today we will learn": "আজ আমরা শিখব",
    "class": "ক্লাস",
    "student": "ছাত্র",
    "teacher": "শিক্ষক",
    "thank you": "ধন্যবাদ",
    "artificial intelligence": "কৃত্রিম बुद्धिमत्ता",
    "mathematics": "গণিত",
  },
  gu: {
    "hello": "નમસ્તે",
    "hi": "નમસ્તે",
    "welcome": "સ્વાગત છે",
    "welcome to class": "વર્ગમાં સ્વાગત છે",
    "good morning": "શુભ સવાર",
    "let us begin": "ચાલો શરૂ કરીએ",
    "class": "વર્ગ",
    "student": "વિદ્યાર્થી",
    "teacher": "શિક્ષક",
    "thank you": "આભાર",
    "mathematics": "ગણિત",
  },
  pa: {
    "hello": "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ",
    "welcome": "ਜੀ ਆਇਆਂ ਨੂੰ",
    "welcome to class": "ਕਲਾਸ ਵਿੱਚ ਜੀ ਆਇਆਂ ਨੂੰ",
    "good morning": "ਸ਼ੁਭ ਸਵੇਰ",
    "class": "ਕਲਾਸ",
    "student": "ਵਿਦਿਆਰਥੀ",
    "teacher": "ਅਧਿਆਪਕ",
    "thank you": "ਧੰਨਵਾਦ",
  },
  ur: {
    "hello": "السلام علیکم",
    "welcome": "خوش آمدید",
    "welcome to class": "کلاس میں خوش آمدید",
    "good morning": "صبح بخیر",
    "let us begin": "آئیے شروع کرتے ہیں",
    "class": "کلاس",
    "student": "طالب علم",
    "teacher": "استاد",
    "thank you": "شکریہ",
  },
  es: {
    "hello": "Hola",
    "hi": "Hola",
    "welcome": "Bienvenido",
    "welcome to class": "Bienvenidos a clase",
    "welcome to the class": "Bienvenidos a la clase",
    "welcome students": "Bienvenidos estudiantes",
    "good morning": "Buenos días",
    "good afternoon": "Buenas tardes",
    "good evening": "Buenas noches",
    "let us begin": "Empecemos",
    "let's begin": "Empecemos",
    "today we will learn": "Hoy aprenderemos",
    "today's topic": "El tema de hoy",
    "lecture": "Conferencia",
    "class": "Clase",
    "classroom": "Aula",
    "student": "Estudiante",
    "students": "Estudiantes",
    "teacher": "Profesor",
    "educator": "Educador",
    "professor": "Profesor",
    "please pay attention": "Por favor presten atención",
    "listen carefully": "Escuchen atentamente",
    "any questions": "¿Alguna pregunta?",
    "is this clear": "¿Está claro?",
    "yes": "Sí",
    "no": "No",
    "okay": "De acuerdo",
    "ok": "OK",
    "thank you": "Gracias",
    "thank you very much": "Muchas gracias",
    "class dismissed": "Clase terminada",
    "artificial intelligence": "Inteligencia Artificial",
    "machine learning": "Aprendizaje Automático",
    "deep learning": "Aprendizaje Profundo",
    "neural networks": "Redes Neuronales",
    "computer science": "Ciencias de la Computación",
    "mathematics": "Matemáticas",
    "physics": "Física",
    "chemistry": "Química",
    "biology": "Biología",
    "question": "Pregunta",
    "answer": "Respuesta",
    "subtitles": "Subtítulos",
  },
  fr: {
    "hello": "Bonjour",
    "hi": "Salut",
    "welcome": "Bienvenue",
    "welcome to class": "Bienvenue en classe",
    "good morning": "Bonjour",
    "good afternoon": "Bon après-midi",
    "let us begin": "Commençons",
    "today we will learn": "Aujourd'hui, nous allons apprendre",
    "lecture": "Cours",
    "class": "Classe",
    "student": "Étudiant",
    "students": "Étudiants",
    "teacher": "Enseignant",
    "thank you": "Merci",
    "thank you very much": "Merci beaucoup",
    "artificial intelligence": "Intelligence Artificielle",
    "mathematics": "Mathématiques",
    "physics": "Physique",
    "chemistry": "Chimie",
    "subtitles": "Sous-titres",
  },
  de: {
    "hello": "Hallo",
    "welcome": "Willkommen",
    "welcome to class": "Willkommen im Unterricht",
    "good morning": "Guten Morgen",
    "let us begin": "Fangen wir an",
    "today we will learn": "Heute lernen wir",
    "lecture": "Vorlesung",
    "class": "Klasse",
    "student": "Student",
    "teacher": "Lehrer",
    "thank you": "Danke",
    "artificial intelligence": "Künstliche Intelligenz",
    "mathematics": "Mathematik",
    "subtitles": "Untertitel",
  },
  ja: {
    "hello": "こんにちは",
    "welcome": "ようこそ",
    "welcome to class": "授業へようこそ",
    "good morning": "おはようございます",
    "let us begin": "始めましょう",
    "today we will learn": "今日は学びます",
    "lecture": "講義",
    "class": "クラス",
    "student": "学生",
    "teacher": "先生",
    "thank you": "ありがとうございます",
    "artificial intelligence": "人工知能",
    "mathematics": "数学",
    "subtitles": "字幕",
  },
  ko: {
    "hello": "안녕하세요",
    "welcome": "환영합니다",
    "welcome to class": "수업에 오신 것을 환영합니다",
    "good morning": "좋은 아침입니다",
    "let us begin": "시작합시다",
    "today we will learn": "오늘은 배울 것입니다",
    "lecture": "강의",
    "class": "수업",
    "student": "학생",
    "teacher": "선생님",
    "thank you": "감사합니다",
    "artificial intelligence": "인공지능",
    "subtitles": "자막",
  },
  "zh-CN": {
    "hello": "你好",
    "welcome": "欢迎",
    "welcome to class": "欢迎来到课堂",
    "good morning": "早上好",
    "let us begin": "我们开始吧",
    "today we will learn": "今天我们将学习",
    "lecture": "讲座",
    "class": "课堂",
    "student": "学生",
    "teacher": "老师",
    "thank you": "谢谢",
    "artificial intelligence": "人工智能",
    "subtitles": "字幕",
  },
  ar: {
    "hello": "مرحباً",
    "welcome": "أهلاً وسهلاً",
    "welcome to class": "مرحباً بكم في الفصل",
    "good morning": "صباح الخير",
    "let us begin": "لنبدأ",
    "today we will learn": "اليوم سنتعلم",
    "lecture": "محاضرة",
    "class": "فصل",
    "student": "طالب",
    "teacher": "معلم",
    "thank you": "شكراً",
    "artificial intelligence": "الذكاء الاصطناعي",
    "subtitles": "ترجمة",
  },
};

export function normalizeLangCode(lang: string): string {
  const clean = (lang || '').trim();
  const lower = clean.toLowerCase();
  if (lower === 'zh-cn' || lower === 'zh_cn' || lower === 'chinese (simplified)') return 'zh-CN';
  if (lower === 'zh-tw' || lower === 'zh_tw' || lower === 'chinese (traditional)') return 'zh-TW';
  if (lower === 'mni-mtei' || lower === 'manipuri') return 'mni-Mtei';
  return clean;
}

export function getCacheKey(text: string, targetLang: string): string {
  return `${normalizeLangCode(targetLang).toLowerCase()}:${text.trim().toLowerCase()}`;
}

export function getCachedTranslation(text: string, targetLang: string): string | null {
  const clean = (text || '').trim();
  if (!clean) return '';
  const code = normalizeLangCode(targetLang);
  if (!code || code.toLowerCase() === 'en' || code.toLowerCase() === 'english') {
    return clean;
  }

  const cacheKey = getCacheKey(clean, code);
  if (IN_MEMORY_CACHE.has(cacheKey)) {
    return IN_MEMORY_CACHE.get(cacheKey)!;
  }

  const dict = DICTIONARY[code] || DICTIONARY[code.toLowerCase()];
  if (dict) {
    const directMatch = dict[clean.toLowerCase()];
    if (directMatch) {
      persistCacheKey(cacheKey, directMatch);
      return directMatch;
    }
  }

  return null;
}

export function translateClientTextSync(text: string, targetLang: string): string | null {
  return getCachedTranslation(text, targetLang);
}

/**
 * Instant token-by-token replacement fallback in 0ms when sentence isn't cached yet.
 * Returns null if no non-English translation could be matched to prevent English text flicker.
 */
export function translateTokensSynchronously(text: string, targetLang: string): string | null {
  const clean = (text || '').trim();
  if (!clean) return null;
  if (!targetLang || targetLang.toLowerCase() === 'en' || targetLang.toLowerCase() === 'english') {
    return clean;
  }

  const cached = getCachedTranslation(clean, targetLang);
  if (cached) return cached;

  const code = normalizeLangCode(targetLang);
  const dict = DICTIONARY[code] || DICTIONARY[code.toLowerCase()];
  if (!dict) return null;

  const words = clean.split(/\s+/);
  let translatedAny = false;
  const converted = words.map((w) => {
    const stripped = w.toLowerCase().replace(/[^a-z0-9]/gi, '');
    if (dict[stripped]) {
      translatedAny = true;
      return dict[stripped];
    }
    return w;
  });

  return translatedAny ? converted.join(' ') : null;
}

export function translateClientText(text: string, targetLang: string): string {
  const clean = (text || '').trim();
  if (!clean || !targetLang || targetLang.toLowerCase() === 'en' || targetLang.toLowerCase() === 'english') {
    return clean;
  }

  const cached = getCachedTranslation(clean, targetLang);
  if (cached !== null) {
    return cached;
  }

  // Trigger background async translation without blocking
  translateClientTextAsync(clean, targetLang).catch(() => {});

  // Return token fallback or clean string
  return translateTokensSynchronously(clean, targetLang) || clean;
}

export async function translateClientTextAsync(text: string, targetLang: string): Promise<string> {
  const clean = (text || '').trim();
  if (!clean || !targetLang || targetLang.toLowerCase() === 'en' || targetLang.toLowerCase() === 'english') {
    return clean;
  }

  const code = normalizeLangCode(targetLang);
  const cacheKey = getCacheKey(clean, code);

  if (IN_MEMORY_CACHE.has(cacheKey)) {
    return IN_MEMORY_CACHE.get(cacheKey)!;
  }

  if (IN_FLIGHT_PROMISES.has(cacheKey)) {
    return IN_FLIGHT_PROMISES.get(cacheKey)!;
  }

  const promise = (async () => {
    // 1. Check exact dictionary match
    const dict = DICTIONARY[code] || DICTIONARY[code.toLowerCase()];
    if (dict && dict[clean.toLowerCase()]) {
      const result = dict[clean.toLowerCase()];
      persistCacheKey(cacheKey, result);
      return result;
    }

    // 2. High-speed ClassAbly backend async translation endpoint (20ms - 40ms)
    try {
      const res = await fetch('/api/lecture-session/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: clean, target_lang: code }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.translated_text && data.translated_text.trim()) {
          const result = data.translated_text.trim();
          if (result && result.toLowerCase() !== clean.toLowerCase()) {
            persistCacheKey(cacheKey, result);
            return result;
          }
        }
      }
    } catch {
      // Ignore network errors
    }

    const fallback = translateTokensSynchronously(clean, code);
    return fallback || '';
  })();

  IN_FLIGHT_PROMISES.set(cacheKey, promise);
  try {
    const result = await promise;
    return result;
  } finally {
    IN_FLIGHT_PROMISES.delete(cacheKey);
  }
}

const STREAM_DEBOUNCE_TIMERS: Map<string, any> = new Map();

/**
 * High-speed incremental streaming translation with smart debouncing (50ms) and instant 0ms cache check.
 * Streams partial phrases in real time as the teacher speaks.
 */
export function streamTranslateAsync(
  text: string,
  targetLang: string,
  onResult: (translated: string) => void
): void {
  const clean = (text || '').trim();
  if (!clean) return;
  if (!targetLang || targetLang.toLowerCase() === 'en' || targetLang.toLowerCase() === 'english') {
    onResult(clean);
    return;
  }

  const code = normalizeLangCode(targetLang);

  // 1. Instant Cache / Dictionary Hit (0ms)
  const cached = getCachedTranslation(clean, code);
  if (cached && cached.toLowerCase() !== clean.toLowerCase()) {
    onResult(cached);
    return;
  }

  // 2. Clear previous pending debounce for this language stream
  if (STREAM_DEBOUNCE_TIMERS.has(code)) {
    clearTimeout(STREAM_DEBOUNCE_TIMERS.get(code));
  }

  // 3. High-speed 50ms streaming bridge
  const timer = setTimeout(async () => {
    STREAM_DEBOUNCE_TIMERS.delete(code);
    try {
      const translated = await translateClientTextAsync(clean, code);
      if (translated && translated.toLowerCase() !== clean.toLowerCase()) {
        onResult(translated);
      }
    } catch {
      // Maintain current caption smoothly
    }
  }, 50);

  STREAM_DEBOUNCE_TIMERS.set(code, timer);
}

/**
 * Pre-warm translations for an array of target languages in the background.
 */
export function prewarmTranslations(text: string, targetLangs: string[] = ['hi', 'te', 'ta', 'mr', 'bn', 'es', 'fr', 'de']) {
  const clean = (text || '').trim();
  if (!clean) return;
  targetLangs.forEach((lang) => {
    translateClientTextAsync(clean, lang).catch(() => {});
  });
}

/**
 * Synchronously generates multi-lingual translation dictionary for a subtitle payload.
 * Runs in 0ms using offline memory cache and dictionary without any network overhead.
 */
export function generateMultiLingualTranslations(rawText: string): Record<string, string> {
  const clean = (rawText || '').trim();
  if (!clean) return {};

  const translations: Record<string, string> = { en: clean };
  const languages = ['hi', 'te', 'ta', 'kn', 'ml', 'mr', 'bn', 'gu', 'pa', 'ur', 'es', 'fr', 'de', 'ja', 'ko', 'zh-CN', 'ar'];

  for (const lang of languages) {
    const cached = getCachedTranslation(clean, lang);
    if (cached) {
      translations[lang] = cached;
    } else {
      const tokenTrans = translateTokensSynchronously(clean, lang);
      if (tokenTrans && tokenTrans !== clean) {
        translations[lang] = tokenTrans;
      }
    }
  }

  return translations;
}
