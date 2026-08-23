// Client-side translation engine with ultra-fast memory cache, async neural translation, and rich educational dictionary
const IN_MEMORY_CACHE = new Map<string, string>();
const IN_FLIGHT_PROMISES = new Map<string, Promise<string>>();

// Rich offline dictionary for common educational terms across major languages
const DICTIONARY: Record<string, Record<string, string>> = {
  hi: {
    "hello": "नमस्ते",
    "hi": "नमस्ते",
    "welcome": "स्वागत है",
    "welcome to class": "कक्षा में आपका स्वागत है",
    "welcome to the class": "कक्षा में आपका स्वागत है",
    "good morning": "सुप्रभात",
    "good afternoon": "शुभ दोपहर",
    "good evening": "शुभ संध्या",
    "let us begin": "आइए शुरू करते हैं",
    "let's begin": "आइए शुरू करते हैं",
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
  },
  te: {
    "hello": "నమస్కారం",
    "hi": "నమస్కారం",
    "welcome": "స్వాగతం",
    "welcome to class": "తరగతికి స్వాగతం",
    "welcome to the class": "తరగతికి స్వాగతం",
    "good morning": "శుభోదయం",
    "good afternoon": "శుభ మధ్యాహ్నం",
    "good evening": "శుభ సాయంత్రం",
    "let us begin": "మనం ప్రారంభిద్దాం",
    "let's begin": "మనం ప్రారంభిద్దాం",
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
  },
  ta: {
    "hello": "வணக்கம்",
    "hi": "வணக்கம்",
    "welcome": "வரவேற்கிறோம்",
    "welcome to class": "வகுப்பிற்கு வரவேற்கிறோம்",
    "good morning": "காலை வணக்கம்",
    "good afternoon": "மதிய வணக்கம்",
    "let us begin": "தொடங்குவோம்",
    "today we will learn": "இன்று நாம் கற்போம்",
    "lecture": "விரிவுரை",
    "class": "வகுப்பு",
    "student": "மாணவர்",
    "teacher": "ஆசிரியர்",
    "thank you": "நன்றி",
    "artificial intelligence": "செயற்கை நுண்ணறிவு",
  },
  es: {
    "hello": "Hola",
    "welcome": "Bienvenido",
    "welcome to class": "Bienvenidos a clase",
    "good morning": "Buenos días",
    "good afternoon": "Buenas tardes",
    "let us begin": "Empecemos",
    "today we will learn": "Hoy aprenderemos",
    "lecture": "Conferencia",
    "class": "Clase",
    "student": "Estudiante",
    "teacher": "Profesor",
    "thank you": "Gracias",
    "artificial intelligence": "Inteligencia Artificial",
  },
  fr: {
    "hello": "Bonjour",
    "welcome": "Bienvenue",
    "welcome to class": "Bienvenue en classe",
    "good morning": "Bonjour",
    "good afternoon": "Bon après-midi",
    "let us begin": "Commençons",
    "today we will learn": "Aujourd'hui, nous allons apprendre",
    "lecture": "Cours",
    "class": "Classe",
    "student": "Étudiant",
    "teacher": "Enseignant",
    "thank you": "Merci",
    "artificial intelligence": "Intelligence Artificielle",
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
    return IN_MEMORY_CACHE.get(cacheKey)!;
  }

  const dict = DICTIONARY[code] || DICTIONARY[code.toLowerCase()];
  if (dict && dict[clean.toLowerCase()]) {
    const res = dict[clean.toLowerCase()];
    IN_MEMORY_CACHE.set(cacheKey, res);
    return res;
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

  // Trigger background async translation without blocking
  translateClientTextAsync(clean, targetLang).catch(() => {});

  // Return empty string or cached rather than returning English gibberish
  return clean;
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
      IN_MEMORY_CACHE.set(cacheKey, result);
      return result;
    }

    // 2. High-speed Direct Google Translate GTX API
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(code)}&dt=t&q=${encodeURIComponent(clean)}`;
      const res = await fetch(url, { method: 'GET' });
      if (res.ok) {
        const data = await res.json();
        if (data && data[0] && Array.isArray(data[0])) {
          const translated = data[0].map((item: any) => item[0]).filter(Boolean).join('').trim();
          if (translated) {
            IN_MEMORY_CACHE.set(cacheKey, translated);
            return translated;
          }
        }
      }
    } catch {
      // Fallback to backend API
    }

    // 3. Fallback to ClassAbly backend translation endpoint
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
          IN_MEMORY_CACHE.set(cacheKey, result);
          return result;
        }
      }
    } catch {
      // Ignore network errors
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

