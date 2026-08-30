import { lectureApi } from '../api/client';

// Client-side translation engine with ultra-fast memory cache, async neural translation, and rich educational dictionary
const IN_MEMORY_CACHE = new Map<string, string>();
const IN_FLIGHT_PROMISES = new Map<string, Promise<string>>();

function isValidTranslation(result: string | null | undefined, original: string): boolean {
  if (!result || typeof result !== 'string') return false;
  const r = result.trim().toLowerCase();
  if (
    !r ||
    r === original.trim().toLowerCase() ||
    r.includes('error 500') ||
    r.includes('<html') ||
    r.includes('<!doctype') ||
    r.includes("that’s an error") ||
    r.includes("that's an error") ||
    r.includes('invalid source language') ||
    r.includes('mymemory warning') ||
    r.includes('too many requests') ||
    r.includes('quota exceeded')
  ) {
    return false;
  }
  return true;
}

// Rich offline dictionary for common educational terms across major languages
const DICTIONARY: Record<string, Record<string, string>> = {
  hi: {
    "hello": "नमस्ते",
    "hi": "नमस्ते",
    "welcome": "स्वागत है",
    "welcome to class": "कक्षा में आपका स्वागत है",
    "welcome to the class": "कक्षा में आपका स्वागत है",
    "hello welcome to class": "नमस्ते कक्षा में आपका स्वागत है",
    "good morning": "सुप्रभात",
    "good afternoon": "शुभ दोपहर",
    "good evening": "शुभ संध्या",
    "let us begin": "आइए शुरू करते हैं",
    "let's begin": "आइए शुरू करते हैं",
    "let us start": "आइए शुरू करते हैं",
    "let's start": "आइए शुरू करते हैं",
    "today we will learn": "आज हम सीखेंगे",
    "today's topic": "आज का विषय",
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
    "question": "प्रश्न",
    "answer": "उत्तर",
    "doubt": "संदेह",
    "hand raised": "हाथ उठाया",
    "subtitles": "उपशीर्षक",
    "step by step formula derivation": "चरण दर चरण सूत्र व्युत्पत्ति",
    "overview of core principles": "मूल सिद्धांतों का अवलोकन",
    "real world applications": "वास्तविक दुनिया के अनुप्रयोग",
  },
  te: {
    "hello": "నమస్కారం",
    "hi": "నమస్కారం",
    "welcome": "స్వాగతం",
    "welcome to class": "తరగతికి స్వాగతం",
    "welcome to the class": "తరగతికి స్వాగతం",
    "hello welcome to class": "హలో తరగతికి స్వాగతం",
    "good morning": "శుభోదయం",
    "good afternoon": "శుభ మధ్యాహ్నం",
    "good evening": "శుభ సాయంత్రం",
    "let us begin": "మనం ప్రారంభిద్దాం",
    "let's begin": "మనం ప్రారంభిద్దాం",
    "let us start": "మనం ప్రారంభిద్దాం",
    "let's start": "మనం ప్రారంభిద్దాం",
    "today we will learn": "ఈరోజు మనం నేర్చుకుంటాము",
    "today's topic": "ఈనాటి అంశం",
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
    "question": "ప్రశ్న",
    "answer": "సమాధానం",
    "doubt": "సందేహం",
    "hand raised": "చేయి పైకెత్తారు",
    "subtitles": "శీర్షికలు",
    "step by step formula derivation": "దశలవారీ ఫార్ములా ఉత్పాదన",
    "overview of core principles": "ముఖ్య సూత్రాల అవలోకనం",
    "real world applications": "రియల్ వరల్డ్ అప్లికేషన్లు",
  },
  ta: {
    "hello": "வணக்கம்",
    "hi": "வணக்கம்",
    "welcome": "வரவேற்கிறோம்",
    "welcome to class": "வகுப்பிற்கு வரவேற்கிறோம்",
    "good morning": "காலை வணக்கம்",
    "good afternoon": "மதிய வணக்கம்",
    "good evening": "மாலை வணக்கம்",
    "let us begin": "தொடங்குவோம்",
    "let's begin": "தொடங்குவோம்",
    "today we will learn": "இன்று நாம் கற்போம்",
    "today's topic": "இன்றைய தலைப்பு",
    "lecture": "விரிவுரை",
    "class": "வகுப்பு",
    "student": "மாணவர்",
    "students": "மாணவர்கள்",
    "teacher": "ஆசிரியர்",
    "thank you": "நன்றி",
    "thank you very much": "மிக்க நன்றி",
    "artificial intelligence": "செயற்கை நுண்ணறிவு",
    "machine learning": "இயந்திர கற்றல்",
    "subtitles": "துணைத்தலைப்புகள்",
  },
  kn: {
    "hello": "ನಮಸ್ಕಾರ",
    "welcome": "ಸ್ವಾಗತ",
    "welcome to class": "ತರಗತಿಗೆ ಸ್ವಾಗತ",
    "good morning": "ಶುಭೋದಯ",
    "let us begin": "ಪ್ರಾರಂಭಿಸೋಣ",
    "today we will learn": "ಇಂದು ನಾವು ಕಲಿಯುತ್ತೇವೆ",
    "lecture": "ಉಪನ್ಯಾಸ",
    "class": "ತರಗತಿ",
    "student": "ವಿದ್ಯಾರ್ಥಿ",
    "teacher": "ಶಿಕ್ಷಕ",
    "thank you": "ಧನ್ಯವಾದಗಳು",
    "artificial intelligence": "ಕೃತಕ ಬುದ್ಧಿಮತ್ತೆ",
  },
  ml: {
    "hello": "നമസ്കാരം",
    "welcome": "സ്വാഗതം",
    "welcome to class": "ക്ലാസ്സിലേക്ക് സ്വാഗതം",
    "good morning": "സുപ്രഭാതം",
    "let us begin": "നമുക്ക് തുടങ്ങാം",
    "today we will learn": "ഇന്ന് നമ്മൾ പഠിക്കും",
    "lecture": "പ്രഭാഷണം",
    "class": "ക്ലാസ്സ്",
    "student": "വിദ്യാർത്ഥി",
    "teacher": "അധ്യാപകൻ",
    "thank you": "നന്ദി",
    "artificial intelligence": "കൃത്രിമ ബുദ്ധി",
  },
  mr: {
    "hello": "नमस्कार",
    "welcome": "स्वागत आहे",
    "welcome to class": "वर्गात आपले स्वागत आहे",
    "good morning": "शुभ प्रभात",
    "let us begin": "सुरु करूया",
    "today we will learn": "आज आपण शिकणार आहोत",
    "lecture": "व्याख्यान",
    "class": "वर्ग",
    "student": "विद्यार्थी",
    "teacher": "शिक्षक",
    "thank you": "धन्यवाद",
    "artificial intelligence": "कृत्रिम बुद्धिमत्ता",
  },
  bn: {
    "hello": "হ্যালো",
    "welcome": "স্বাগতম",
    "welcome to class": "ক্লাসে স্বাগতম",
    "good morning": "সুপ্রভাত",
    "let us begin": "চলুন শুরু করি",
    "today we will learn": "আজ আমরা শিখব",
    "lecture": "বক্তৃতা",
    "class": "ক্লাস",
    "student": "ছাত্র",
    "teacher": "শিক্ষক",
    "thank you": "ধন্যবাদ",
    "artificial intelligence": "কৃত্রিম বুদ্ধিমত্তা",
  },
  gu: {
    "hello": "નમસ્તે",
    "welcome": "સ્વાગત છે",
    "welcome to class": "વર્ગમાં આપનું સ્વાગત છે",
    "good morning": "સુપ્રભાત",
    "let us begin": "ચાલો શરૂ કરીએ",
    "today we will learn": "આજે આપણે શીખીશું",
    "lecture": "વ્યાખ્યાન",
    "class": "વર્ગ",
    "student": "વિદ્યાર્થી",
    "teacher": "શિક્ષક",
    "thank you": "આભાર",
    "artificial intelligence": "કૃત્રિમ બુદ્ધિ",
  },
  pa: {
    "hello": "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ",
    "welcome": "ਜੀ ਆਇਆਂ ਨੂੰ",
    "welcome to class": "ਕਲਾਸ ਵਿੱਚ ਜੀ ਆਇਆਂ ਨੂੰ",
    "good morning": "ਸ਼ੁਭ ਸਵੇਰ",
    "let us begin": "ਆਓ ਸ਼ੁਰੂ ਕਰੀਏ",
    "today we will learn": "ਅੱਜ ਅਸੀਂ ਸਿੱਖਾਂਗੇ",
    "lecture": "ਲੈਕਚਰ",
    "class": "ਕਲਾਸ",
    "student": "ਵਿਦਿਆਰਥੀ",
    "teacher": "ਅਧਿਆਪਕ",
    "thank you": "ਧੰਨਵਾਦ",
    "artificial intelligence": "ਨਕਲੀ ਬੁੱਧੀ",
  },
  ur: {
    "hello": "ہیلو",
    "welcome": "خوش آمدید",
    "welcome to class": "کلاس میں خوش آمدید",
    "good morning": "صبح بخیر",
    "let us begin": "آئیے شروع کریں",
    "today we will learn": "آج ہم سیکھیں گے",
    "lecture": "لیکچر",
    "class": "کلاس",
    "student": "طالب علم",
    "teacher": "استاد",
    "thank you": "شکریہ",
    "artificial intelligence": "مصنوعی ذہانت",
  },
  es: {
    "hello": "Hola",
    "hi": "Hola",
    "welcome": "Bienvenido",
    "welcome to class": "Bienvenidos a clase",
    "welcome to the class": "Bienvenidos a la clase",
    "good morning": "Buenos días",
    "good afternoon": "Buenas tardes",
    "good evening": "Buenas noches",
    "let us begin": "Empecemos",
    "let's begin": "Empecemos",
    "today we will learn": "Hoy aprenderemos",
    "lecture": "Conferencia",
    "class": "Clase",
    "classroom": "Aula",
    "student": "Estudiante",
    "students": "Estudiantes",
    "teacher": "Profesor",
    "thank you": "Gracias",
    "thank you very much": "Muchas gracias",
    "artificial intelligence": "Inteligencia Artificial",
    "subtitles": "Subtítulos",
  },
  fr: {
    "hello": "Bonjour",
    "hi": "Salut",
    "welcome": "Bienvenue",
    "welcome to class": "Bienvenue en classe",
    "welcome to the class": "Bienvenue dans la classe",
    "good morning": "Bonjour",
    "good afternoon": "Bon après-midi",
    "good evening": "Bonsoir",
    "let us begin": "Commençons",
    "let's begin": "Commençons",
    "today we will learn": "Aujourd'hui, nous allons apprendre",
    "lecture": "Cours",
    "class": "Classe",
    "classroom": "Salle de classe",
    "student": "Étudiant",
    "students": "Étudiants",
    "teacher": "Enseignant",
    "thank you": "Merci",
    "thank you very much": "Merci beaucoup",
    "artificial intelligence": "Intelligence Artificielle",
    "subtitles": "Sous-titres",
  },
  de: {
    "hello": "Hallo",
    "hi": "Hallo",
    "welcome": "Willkommen",
    "welcome to class": "Willkommen im Unterricht",
    "welcome to the class": "Willkommen in der Klasse",
    "good morning": "Guten Morgen",
    "good afternoon": "Guten Tag",
    "good evening": "Guten Abend",
    "let us begin": "Fangen wir an",
    "let's begin": "Fangen wir an",
    "today we will learn": "Heute lernen wir",
    "lecture": "Vorlesung",
    "class": "Klasse",
    "student": "Student",
    "students": "Studenten",
    "teacher": "Lehrer",
    "thank you": "Danke",
    "thank you very much": "Vielen Dank",
    "artificial intelligence": "Künstliche Intelligenz",
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
  },
  ru: {
    "hello": "Здравствуйте",
    "welcome": "Добро пожаловать",
    "welcome to class": "Добро пожаловать на урок",
    "good morning": "Доброе утро",
    "let us begin": "Давайте начнем",
    "today we will learn": "Сегодня мы узнаем",
    "lecture": "Лекция",
    "class": "Класс",
    "student": "Студент",
    "teacher": "Учитель",
    "thank you": "Спасибо",
    "artificial intelligence": "Искусственный интеллект",
  },
};

function normalizeLangCode(lang: string): string {
  const clean = (lang || '').trim();
  const lower = clean.toLowerCase();
  if (lower === 'zh-cn' || lower === 'zh_cn' || lower === 'chinese (simplified)') return 'zh-CN';
  if (lower === 'zh-tw' || lower === 'zh_tw' || lower === 'chinese (traditional)') return 'zh-TW';
  if (lower === 'mni-mtei' || lower === 'manipuri') return 'mni-Mtei';
  return clean;
}

function getCacheKey(text: string, targetLang: string): string {
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
    const cached = IN_MEMORY_CACHE.get(cacheKey)!;
    if (isValidTranslation(cached, clean)) {
      return cached;
    }
  }

  const dict = DICTIONARY[code] || DICTIONARY[code.toLowerCase()];
  if (dict) {
    const lowered = clean.toLowerCase();
    if (dict[lowered]) {
      const res = dict[lowered];
      IN_MEMORY_CACHE.set(cacheKey, res);
      return res;
    }

    // Phrase-level dictionary fallback for instant 0ms draft
    let matched = false;
    let draft = lowered;
    const keys = Object.keys(dict).sort((a, b) => b.length - a.length);
    for (const phrase of keys) {
      if (draft.includes(phrase)) {
        draft = draft.split(phrase).join(dict[phrase]);
        matched = true;
      }
    }
    if (matched && draft !== lowered) {
      return draft;
    }
  }

  return null;
}

export function getOrDraftTranslation(text: string, targetLang: string): string | null {
  const clean = (text || '').trim();
  if (!clean) return '';
  const code = normalizeLangCode(targetLang);
  if (!code || code.toLowerCase() === 'en' || code.toLowerCase() === 'english') {
    return clean;
  }

  // 1. Direct cached translation
  const cached = getCachedTranslation(clean, code);
  if (cached && isValidTranslation(cached, clean)) {
    return cached;
  }

  // 2. Sub-phrase & word replacement draft
  const dict = DICTIONARY[code] || DICTIONARY[code.toLowerCase()];
  if (dict) {
    const lowered = clean.toLowerCase();
    let draft = lowered;
    let replacedAny = false;
    const keys = Object.keys(dict).sort((a, b) => b.length - a.length);
    for (const phrase of keys) {
      if (draft.includes(phrase)) {
        draft = draft.split(phrase).join(dict[phrase]);
        replacedAny = true;
      }
    }
    if (replacedAny && draft !== lowered) {
      return draft;
    }
  }

  return null;
}

export function translateClientTextSync(text: string, targetLang: string): string | null {
  return getCachedTranslation(text, targetLang);
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

  // Check draft translation for 0ms non-English rendering
  const draft = getOrDraftTranslation(clean, targetLang);

  // Trigger background async translation without blocking
  translateClientTextAsync(clean, targetLang).catch(() => {});

  return draft || clean;
}

export async function translateClientTextAsync(text: string, targetLang: string): Promise<string> {
  const clean = (text || '').trim();
  if (!clean || !targetLang || targetLang.toLowerCase() === 'en' || targetLang.toLowerCase() === 'english') {
    return clean;
  }

  const code = normalizeLangCode(targetLang);
  const cacheKey = getCacheKey(clean, code);

  if (IN_MEMORY_CACHE.has(cacheKey)) {
    const cached = IN_MEMORY_CACHE.get(cacheKey)!;
    if (isValidTranslation(cached, clean)) {
      return cached;
    }
  }

  if (IN_FLIGHT_PROMISES.has(cacheKey)) {
    return IN_FLIGHT_PROMISES.get(cacheKey)!;
  }

  const promise = (async (): Promise<string> => {
    // 1. Check exact dictionary match
    const dict = DICTIONARY[code] || DICTIONARY[code.toLowerCase()];
    if (dict && dict[clean.toLowerCase()]) {
      const result = dict[clean.toLowerCase()];
      IN_MEMORY_CACHE.set(cacheKey, result);
      return result;
    }

    // 2. High-speed Direct Google Translate GTX API (Ultra-low latency ~20-50ms)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(code)}&dt=t&q=${encodeURIComponent(clean)}`;
      const res = await fetch(url, { method: 'GET', signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        if (data && data[0] && Array.isArray(data[0])) {
          const translated = data[0].map((item: any) => item[0]).filter(Boolean).join('').trim();
          if (isValidTranslation(translated, clean)) {
            IN_MEMORY_CACHE.set(cacheKey, translated);
            return translated;
          }
        }
      }
    } catch {
      // Fallback to backend service
    }

    // 3. ClassAbly Backend Neural Translation Service
    try {
      const res = await lectureApi.translate({ text: clean, target_lang: code });
      if (res.data && res.data.translated_text) {
        const result = res.data.translated_text.trim();
        if (isValidTranslation(result, clean)) {
          IN_MEMORY_CACHE.set(cacheKey, result);
          return result;
        }
      }
    } catch {
      // Fallback
    }

    // 4. High-speed MyMemory Translation API with explicit en source
    try {
      const mmUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(clean)}&langpair=en|${encodeURIComponent(code)}`;
      const res = await fetch(mmUrl, { method: 'GET' });
      if (res.ok) {
        const data = await res.json();
        const translated = (data?.responseData?.translatedText || '').trim();
        if (isValidTranslation(translated, clean)) {
          IN_MEMORY_CACHE.set(cacheKey, translated);
          return translated;
        }
      }
    } catch {
      // Fallback
    }

    // 5. Offline phrase-level dictionary fallback
    const phraseDraft = getOrDraftTranslation(clean, code);
    if (phraseDraft && isValidTranslation(phraseDraft, clean)) {
      return phraseDraft;
    }

    return clean;
  })();

  IN_FLIGHT_PROMISES.set(cacheKey, promise);
  try {
    const result = await promise;
    return result;
  } finally {
    IN_FLIGHT_PROMISES.delete(cacheKey);
  }
}
