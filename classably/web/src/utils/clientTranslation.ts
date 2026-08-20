// Client-side translation helper with rich offline dictionary and phonetic transliteration for 100% native script rendering
const LOCAL_DICTIONARY: Record<string, Record<string, string>> = {
  hi: {
    // Greetings & Classroom Starters
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
    "lets start": "शुरू करते हैं",
    "let's start": "शुरू करते हैं",
    "start": "शुरू",
    "stop": "रोकें",
    "today": "आज",
    "today we will learn": "आज हम सीखेंगे",
    "today we are going to study": "आज हम अध्ययन करेंगे",
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
    "understand": "समझें",
    "understood": "समझ गए",
    "thank you": "धन्यवाद",
    "thank you very much": "बहुत-बहुत धन्यवाद",
    "class dismissed": "कक्षा समाप्त",
    "see you in the next class": "अगली कक्षा में मिलते हैं",

    // General Academic & STEM Concepts
    "artificial intelligence": "कृत्रिम बुद्धिमत्ता",
    "machine learning": "मशीन लर्निंग",
    "deep learning": "डीप लर्निंग",
    "deep neural networks": "डीप न्यूरल नेटवर्क",
    "neural networks": "न्यूरल नेटवर्क",
    "neural network": "न्यूरल नेटवर्क",
    "convolutional neural network": "कन्वोल्यूशनल न्यूरल नेटवर्क",
    "convolutional": "कन्वोल्यूशनल",
    "board ocr recognition": "बोर्ड ओसीआर पहचान",
    "speech to text": "स्पीच टू टेक्स्ट",
    "subtitles": "उपशीर्षक",
    "next topic": "अगला विषय",
    "topic": "विषय",
    "chapter": "अध्याय",
    "lesson": "पाठ",
    "question": "प्रश्न",
    "questions": "प्रश्न",
    "answer": "उत्तर",
    "doubt": "संदेह",
    "doubts": "संदेह",
    "hand raised": "हाथ उठाया",
    "raise hand": "हाथ उठाएं",
    "overview of core principles": "मूल सिद्धांतों का अवलोकन",
    "step by step formula derivation": "चरण दर चरण सूत्र व्युत्पत्ति",
    "step by step": "चरण दर चरण",
    "formula": "सूत्र",
    "formulas": "सूत्र",
    "derivation": "व्युत्पत्ति",
    "theorem": "प्रमेय",
    "proof": "प्रमाण",
    "equation": "समीकरण",
    "equations": "समीकरण",
    "matrix": "मैट्रिक्स",
    "vector": "वेक्टर",
    "vectors": "वेक्टर",
    "algorithm": "एल्गोरिदम",
    "algorithms": "एल्गोरिदम",
    "data structures": "डेटा संरचनाएं",
    "computer science": "कंप्यूटर विज्ञान",
    "mathematics": "गणित",
    "physics": "भौतिकी",
    "chemistry": "रसायन विज्ञान",
    "biology": "जीव विज्ञान",
    "real world applications": "वास्तविक दुनिया के अनुप्रयोग",
    "example": "उदाहरण",
    "examples": "उदाहरण",
    "for example": "उदाहरण के लिए",
    "note": "नोट",
    "important": "महत्वपूर्ण",
    "concept": "अवधारणा",
    "concepts": "अवधारणाएं",
    "diagram": "चित्र",
    "definition": "परिभाषा",
    "definitions": "परिभाषाएं",
    "summary": "सारांश",
    "takeaway": "मुख्य बिंदु",

    // Common Connectors & Verbs & Words
    "we": "हम",
    "are": "हैं",
    "is": "है",
    "am": "हूँ",
    "the": "",
    "a": "एक",
    "an": "एक",
    "and": "और",
    "or": "या",
    "in": "में",
    "on": "पर",
    "at": "पर",
    "to": "को",
    "for": "के लिए",
    "from": "से",
    "with": "के साथ",
    "by": "द्वारा",
    "of": "का",
    "this": "यह",
    "that": "वह",
    "these": "ये",
    "those": "वे",
    "here": "यहाँ",
    "there": "वहाँ",
    "learning": "सीख रहे",
    "studying": "अध्ययन कर रहे",
    "discussing": "चर्चा कर रहे",
    "explaining": "समझा रहे",
    "solving": "हल कर रहे",
    "problem": "समस्या",
    "problems": "समस्याएं",
    "solution": "समाधान",
    "solutions": "समाधान",
    "first": "पहला",
    "second": "दूसरा",
    "third": "तीसरा",
    "finally": "अंत में",
    "now": "अब",
    "all": "सभी",
    "some": "कुछ",
    "many": "कई",
    "good": "अच्छा",
    "great": "शानदार",
    "right": "सही",
    "correct": "सही",
    "wrong": "गलत",
  },
  te: {
    // Greetings & Classroom Starters
    "hello": "హలో",
    "hi": "నమస్తే",
    "welcome": "స్వాగతం",
    "welcome to class": "తరగతికి స్వాగతం",
    "welcome to the class": "తరగతికి స్వాగతం",
    "hello welcome to class": "నమస్తే తరగతికి స్వాగతం",
    "good morning": "శుభోదయం",
    "good afternoon": "శుభ మధ్యాహ్నం",
    "good evening": "శుభ సాయంత్రం",
    "let us begin": "మనం ప్రారంభిద్దాం",
    "let's begin": "మనం ప్రారంభిద్దాం",
    "lets start": "ప్రారంభిద్దాం",
    "let's start": "ప్రారంభిద్దాం",
    "start": "ప్రారంభం",
    "stop": "ఆపు",
    "today": "ఈరోజు",
    "today we will learn": "ఈరోజు మనం నేర్చుకుంటాము",
    "today we are going to study": "ఈరోజు మనం చదువుకోబోతున్నాము",
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
    "listen carefully": "శ్రద్ధగా వినండి",
    "any questions": "ఏవైనా ప్రశ్నలు ఉన్నాయా",
    "do you have any questions": "మీకు ఏమైనా ప్రశ్నలు ఉన్నాయా",
    "is this clear": "ఇది స్పష్టంగా ఉందా",
    "yes": "అవును",
    "no": "కాదు",
    "okay": "సరే",
    "ok": "సరే",
    "understand": "అర్థం చేసుకోండి",
    "understood": "అర్థమైంది",
    "thank you": "ధన్యవాదాలు",
    "thank you very much": "చాలా ధన్యవాదాలు",
    "class dismissed": "తరగతి పూర్తయింది",
    "see you in the next class": "తదుపరి తరగతిలో కలుద్దాం",

    // General Academic & STEM Concepts
    "artificial intelligence": "కృత్రిమ మేధస్సు",
    "machine learning": "మెషిన్ లెర్నింగ్",
    "deep learning": "డీప్ లెర్నింగ్",
    "deep neural networks": "డీప్ న్యూరల్ నెట్‌వర్క్‌లు",
    "neural networks": "న్యూరల్ నెట్‌వర్క్‌లు",
    "neural network": "న్యూరల్ నెట్‌వర్క్",
    "convolutional neural network": "కన్వోల్యూషనల్ న్యూరల్ నెట్‌వర్క్",
    "convolutional": "కన్వోల్యూషనల్",
    "board ocr recognition": "బోర్డు ఓసిఆర్ గుర్తింపు",
    "speech to text": "స్పీచ్ టు టెక్స్ట్",
    "subtitles": "శీర్షికలు",
    "next topic": "తదుపరి అంశం",
    "topic": "అంశం",
    "chapter": "పాఠ్యాంశం",
    "lesson": "పాఠం",
    "question": "ప్రశ్న",
    "questions": "ప్రశ్నలు",
    "answer": "సమాధానం",
    "doubt": "సందేహం",
    "doubts": "సందేహాలు",
    "hand raised": "చేయి పైకెత్తారు",
    "raise hand": "చేయి ఎత్తండి",
    "overview of core principles": "ముఖ్య సూత్రాల అవలోకనం",
    "step by step formula derivation": "దశలవారీ ఫార్ములా ఉత్పాదన",
    "step by step": "దశలవారీగా",
    "formula": "సూత్రం",
    "formulas": "సూత్రాలు",
    "derivation": "ఉత్పాదన",
    "theorem": "సిద్ధాంతం",
    "proof": "రుజువు",
    "equation": "సమీకరణం",
    "equations": "సమీకరణాలు",
    "matrix": "మాత్రిక",
    "vector": "సదిశ",
    "vectors": "సదిశలు",
    "algorithm": "అల్గారిథమ్",
    "algorithms": "అల్గారిథమ్‌లు",
    "data structures": "డేటా స్ట్రక్చర్స్",
    "computer science": "కంప్యూటర్ సైన్స్",
    "mathematics": "గణితం",
    "physics": "భౌతికశాస్త్రం",
    "chemistry": "రసాయనశాస్త్రం",
    "biology": "జీవశాస్త్రం",
    "real world applications": "రియల్ వరల్డ్ అప్లికేషన్లు",
    "example": "ఉదాహరణ",
    "examples": "ఉదాహరణలు",
    "for example": "ఉదాహరణకు",
    "note": "గమనిక",
    "important": "ముఖ్యమైనది",
    "concept": "భావన",
    "concepts": "భావనలు",
    "diagram": "రేఖాచిత్రం",
    "definition": "నిర్వచనం",
    "definitions": "నిర్వచనాలు",
    "summary": "సారాంశం",
    "takeaway": "కీలక అంశాలు",

    // Common Connectors & Verbs & Words
    "we": "మనం",
    "are": "ఉన్నాము",
    "is": "ఉంది",
    "am": "ఉన్నాను",
    "the": "",
    "a": "ఒక",
    "an": "ఒక",
    "and": "మరియు",
    "or": "లేదా",
    "in": "లో",
    "on": "పై",
    "at": "వద్ద",
    "to": "కు",
    "for": "కొరకు",
    "from": "నుండి",
    "with": "తో",
    "by": "ద్వారా",
    "of": "యొక్క",
    "this": "ఇది",
    "that": "అది",
    "these": "ఇవి",
    "those": "అవి",
    "here": "ఇక్కడ",
    "there": "అక్కడ",
    "learning": "నేర్చుకుంటున్నాము",
    "studying": "చదువుకుంటున్నాము",
    "discussing": "చర్చిస్తున్నాము",
    "explaining": "వివరిస్తున్నాము",
    "solving": "సాధిస్తున్నాము",
    "problem": "సమస్య",
    "problems": "సమస్యలు",
    "solution": "పరిష్కారం",
    "solutions": "పరిష్కారాలు",
    "first": "మొదటి",
    "second": "రెండవ",
    "third": "మూడవ",
    "finally": "చివరగా",
    "now": "ఇప్పుడు",
    "all": "అన్ని",
    "some": "కొన్ని",
    "many": "చాలా",
    "good": "మంచి",
    "great": "గొప్ప",
    "right": "సరైనది",
    "correct": "సరైనది",
    "wrong": "తప్పు",
  }
};

// Transliteration maps for fallback English words into target script
const HINDI_MAP: Record<string, string> = {
  "ch": "च", "sh": "श", "th": "थ", "ph": "फ", "kh": "ख", "gh": "घ", "bh": "भ", "dh": "ध",
  "a": "ा", "b": "ब", "c": "क", "d": "ड", "e": "े", "f": "फ", "g": "ग", "h": "ह", "i": "ी",
  "j": "ज", "k": "क", "l": "ल", "m": "म", "n": "न", "o": "ो", "p": "प", "q": "क", "r": "र",
  "s": "स", "t": "ट", "u": "ू", "v": "व", "w": "व", "x": "क्स", "y": "य", "z": "ज़"
};

const TELUGU_MAP: Record<string, string> = {
  "ch": "చ", "sh": "శ", "th": "త", "ph": "ఫ", "kh": "ఖ", "gh": "ఘ", "bh": "భ", "dh": "ధ",
  "a": "ా", "b": "బ", "c": "క", "d": "డ", "e": "ే", "f": "ఫ", "g": "గ", "h": "హ", "i": "ీ",
  "j": "జ", "k": "క", "l": "ల", "m": "మ", "n": "న", "o": "ో", "p": "ప", "q": "క", "r": "ర",
  "s": "స", "t": "ట", "u": "ూ", "v": "వ", "w": "వ", "x": "క్స్", "y": "య", "z": "జ"
};

function transliterateWord(word: string, lang: "hi" | "te"): string {
  const map = lang === "hi" ? HINDI_MAP : TELUGU_MAP;
  let lower = word.toLowerCase();
  let result = "";
  let i = 0;
  while (i < lower.length) {
    if (i + 1 < lower.length && map[lower.substring(i, i + 2)]) {
      result += map[lower.substring(i, i + 2)];
      i += 2;
    } else if (map[lower[i]]) {
      result += map[lower[i]];
      i++;
    } else {
      result += lower[i];
      i++;
    }
  }
  return result || word;
}

export function translateClientText(text: string, targetLang: string): string {
  const clean = (text || "").trim();
  if (!clean || !targetLang || targetLang.toLowerCase() === "en" || targetLang.toLowerCase() === "english") {
    return clean;
  }

  const code = targetLang.toLowerCase() === "hindi" ? "hi" : targetLang.toLowerCase() === "telugu" ? "te" : (targetLang.toLowerCase() as "hi" | "te");
  const dict = LOCAL_DICTIONARY[code];
  if (!dict) return clean;

  const lowered = clean.toLowerCase();
  if (dict[lowered]) {
    return dict[lowered];
  }

  // Multi-word phrase matching (greedy replacement)
  let transformed = clean;
  const sortedPhrases = Object.keys(dict).sort((a, b) => b.length - a.length);
  for (const phrase of sortedPhrases) {
    if (phrase.includes(" ") && transformed.toLowerCase().includes(phrase)) {
      const regex = new RegExp(`\\b${phrase}\\b`, "gi");
      transformed = transformed.replace(regex, dict[phrase]);
    }
  }

  // Word-by-word replacement with transliteration fallback (ensures NO English characters appear)
  const words = transformed.split(/\s+/);
  const result = words.map(w => {
    // If the word already contains non-ASCII characters (already translated), keep it
    if (/[^\x00-\x7F]/.test(w)) {
      return w;
    }
    const cleanWord = w.toLowerCase().replace(/[^a-z0-9']/g, "");
    if (dict[cleanWord]) {
      return dict[cleanWord];
    }
    if (cleanWord.length > 0) {
      return transliterateWord(cleanWord, code);
    }
    return w;
  }).join(" ");

  return result.trim() || clean;
}
