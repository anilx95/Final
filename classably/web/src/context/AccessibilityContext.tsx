import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type DisabilityProfile = 
  | 'visual_impairment' 
  | 'low_vision' 
  | 'hearing_impairment' 
  | 'language_barrier' 
  | 'multiple_disabilities';

export type HighContrastMode = 'none' | 'yellow-on-black' | 'black-on-white';

interface AccessibilityContextType {
  activeDisabilities: DisabilityProfile[];
  toggleDisability: (profile: DisabilityProfile) => void;
  fontSize: 'normal' | 'large' | 'extra-large';
  setFontSize: (size: 'normal' | 'large' | 'extra-large') => void;
  contrastMode: HighContrastMode;
  setContrastMode: (mode: HighContrastMode) => void;
  targetLanguage: string;
  setTargetLanguage: (lang: string) => void;
  ttsEnabled: boolean;
  setTtsEnabled: (enabled: boolean) => void;
  speakText: (text: string) => void;
  stopSpeech: () => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeDisabilities, setActiveDisabilities] = useState<DisabilityProfile[]>(() => {
    const saved = localStorage.getItem('classably_disabilities');
    return saved ? JSON.parse(saved) : [];
  });

  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'extra-large'>('normal');
  const [contrastMode, setContrastMode] = useState<HighContrastMode>('none');
  const [targetLanguage, setTargetLanguage] = useState<string>('en');
  const [ttsEnabled, setTtsEnabled] = useState<boolean>(false);

  // Sync disabilities & apply theme adaptivity
  useEffect(() => {
    localStorage.setItem('classably_disabilities', JSON.stringify(activeDisabilities));

    const body = document.body;
    body.classList.remove('high-contrast-black', 'high-contrast-white', 'large-text', 'extra-large-text');

    if (activeDisabilities.includes('visual_impairment') || activeDisabilities.includes('low_vision')) {
      setFontSize('extra-large');
      setContrastMode('yellow-on-black');
      setTtsEnabled(true);
    } else if (activeDisabilities.includes('hearing_impairment')) {
      // Hearing impairment defaults to enhanced subtitles view
    } else if (activeDisabilities.includes('language_barrier')) {
      setTargetLanguage('es');
    }

    if (contrastMode === 'yellow-on-black') {
      body.classList.add('high-contrast-black');
    } else if (contrastMode === 'black-on-white') {
      body.classList.add('high-contrast-white');
    }

    if (fontSize === 'large') {
      body.classList.add('large-text');
    } else if (fontSize === 'extra-large') {
      body.classList.add('extra-large-text');
    }
  }, [activeDisabilities, contrastMode, fontSize]);

  const toggleDisability = useCallback((profile: DisabilityProfile) => {
    setActiveDisabilities((prev) =>
      prev.includes(profile) ? prev.filter((p) => p !== profile) : [...prev, profile]
    );
  }, []);

  const speakText = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  }, []);

  const stopSpeech = useCallback(() => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
  }, []);

  return (
    <AccessibilityContext.Provider
      value={{
        activeDisabilities,
        toggleDisability,
        fontSize,
        setFontSize,
        contrastMode,
        setContrastMode,
        targetLanguage,
        setTargetLanguage,
        ttsEnabled,
        setTtsEnabled,
        speakText,
        stopSpeech,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) throw new Error('useAccessibility must be used within AccessibilityProvider');
  return context;
};
