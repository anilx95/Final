// Client-side translation helper with offline dictionary fallback for classroom terminology
const LOCAL_DICTIONARY: Record<string, Record<string, string>> = {
  hi: {
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
    "convolutional layer filters": "कन्वोल्यूशनल लेयर फ़िल्टर",
    "question": "प्रश्न",
    "hand raised": "हाथ उठाया",
    "accessibility": "सुगमता",
    "overview of core principles": "मूल सिद्धांतों का अवलोकन",
    "step by step formula derivation": "चरण दर चरण सूत्र व्युत्पत्ति",
    "real world applications": "वास्तविक दुनिया के अनुप्रयोग",
  },
  te: {
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
    "convolutional layer filters": "కన్వోల్యూషనల్ లేయర్ ఫిల్టర్లు",
    "question": "ప్రశ్న",
    "hand raised": "చెయ్యి పైకెత్తారు",
    "accessibility": "సౌలభ్యం",
    "overview of core principles": "ముఖ్య సూత్రాల అవలోకనం",
    "step by step formula derivation": "దశలవారీ ఫార్ములా ఉత్పాదన",
    "real world applications": "రియల్ వరల్డ్ అప్లికేషన్లు",
  }
};

export function translateClientText(text: string, targetLang: string): string {
  const clean = (text || "").trim();
  if (!clean || !targetLang || targetLang.toLowerCase() === "en" || targetLang.toLowerCase() === "english") {
    return clean;
  }

  const code = targetLang.toLowerCase() === "hindi" ? "hi" : targetLang.toLowerCase() === "telugu" ? "te" : targetLang.toLowerCase();
  const dict = LOCAL_DICTIONARY[code];
  if (!dict) return clean;

  const lowered = clean.toLowerCase();
  if (dict[lowered]) {
    return dict[lowered];
  }

  // Word-by-word fallback
  const words = lowered.split(/\s+/);
  let replaced = false;
  const result = words.map(w => {
    const key = w.replace(/[^a-zA-Z]/g, "");
    if (dict[key]) {
      replaced = true;
      return dict[key];
    }
    return w;
  }).join(" ");

  return replaced ? result : clean;
}
