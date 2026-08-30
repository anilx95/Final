// Language persistence across component mounts/unmounts per lecture session

const STORAGE_PREFIX = 'classably_lecture_lang_';
const GLOBAL_TEACHER_LANG_KEY = 'classably_teacher_selected_lang';
const STUDENT_LANG_KEY = 'classably_student_selected_lang';

export const getStudentSelectedLanguage = (defaultLang: string = 'en'): string => {
  try {
    const stored = localStorage.getItem(STUDENT_LANG_KEY);
    if (stored && typeof stored === 'string') return stored;
  } catch {}
  return defaultLang;
};

export const setStudentSelectedLanguage = (lang: string): void => {
  try {
    if (!lang) return;
    localStorage.setItem(STUDENT_LANG_KEY, lang);
  } catch {}
};

export const getSessionLanguage = (sessionId: number | null, defaultLang: string = 'en'): string => {
  try {
    if (sessionId) {
      const stored = localStorage.getItem(`${STORAGE_PREFIX}${sessionId}`);
      if (stored && typeof stored === 'string') return stored;
    }
    const globalStored = localStorage.getItem(GLOBAL_TEACHER_LANG_KEY);
    if (globalStored && typeof globalStored === 'string') return globalStored;
  } catch {}
  return defaultLang;
};

export const setSessionLanguage = (sessionId: number | null, lang: string): void => {
  try {
    if (!lang) return;
    if (sessionId) {
      localStorage.setItem(`${STORAGE_PREFIX}${sessionId}`, lang);
    }
    localStorage.setItem(GLOBAL_TEACHER_LANG_KEY, lang);
  } catch {}
};

export const clearSessionLanguage = (sessionId: number | null): void => {
  try {
    if (sessionId) {
      localStorage.removeItem(`${STORAGE_PREFIX}${sessionId}`);
    }
  } catch {}
};

