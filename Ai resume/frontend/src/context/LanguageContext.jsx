import React, { createContext, useContext, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';

const LanguageContext = createContext(null);

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸', dir: 'ltr' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা (Bengali)', flag: '🇧🇩', dir: 'ltr' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी (Hindi)', flag: '🇮🇳', dir: 'ltr' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية (Arabic)', flag: '🇸🇦', dir: 'rtl' },
  { code: 'es', name: 'Spanish', nativeName: 'Español (Spanish)', flag: '🇪🇸', dir: 'ltr' },
  { code: 'fr', name: 'French', nativeName: 'Français (French)', flag: '🇫🇷', dir: 'ltr' },
  { code: 'de', name: 'German', nativeName: 'Deutsch (German)', flag: '🇩🇪', dir: 'ltr' },
  { code: 'zh', name: 'Chinese', nativeName: '中文 (Chinese)', flag: '🇨🇳', dir: 'ltr' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語 (Japanese)', flag: '🇯🇵', dir: 'ltr' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو (Urdu)', flag: '🇵🇰', dir: 'rtl' },
];

export const GOOGLE_TRANSLATE_LANG_MAP = {
  en: 'en',
  bn: 'bn',
  hi: 'hi',
  ar: 'ar',
  es: 'es',
  fr: 'fr',
  de: 'de',
  zh: 'zh-CN',
  ja: 'ja',
  ur: 'ur',
  ru: 'ru',
  pt: 'pt',
  it: 'it',
  ko: 'ko',
  tr: 'tr',
};

export const RTL_LANGUAGES = ['ar', 'ur'];

export const setGoogleTranslateCookie = (langCode) => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const target = GOOGLE_TRANSLATE_LANG_MAP[langCode] || langCode;
  const hostname = window.location.hostname;

  if (target === 'en') {
    document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${hostname};`;
    document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    document.cookie = `googtrans=/en/en; path=/; domain=${hostname};`;
    document.cookie = `googtrans=/en/en; path=/;`;
  } else {
    document.cookie = `googtrans=/en/${target}; path=/; domain=${hostname};`;
    document.cookie = `googtrans=/en/${target}; path=/;`;
  }
};

export const LanguageProvider = ({ children }) => {
  const { t, i18n } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState(() => {
    return (
      localStorage.getItem('app_selected_locale') ||
      localStorage.getItem('app_locale') ||
      i18n.language ||
      'en'
    );
  });

  const isRTL = RTL_LANGUAGES.includes(currentLanguage);

  const applyDirectionAndLang = (lang) => {
    if (typeof document !== 'undefined') {
      const isRightToLeft = RTL_LANGUAGES.includes(lang);
      document.documentElement.dir = isRightToLeft ? 'rtl' : 'ltr';
      document.documentElement.lang = lang;
      if (isRightToLeft) {
        document.documentElement.classList.add('rtl-layout');
      } else {
        document.documentElement.classList.remove('rtl-layout');
      }
    }
  };

  // Sync direction on language change
  useEffect(() => {
    applyDirectionAndLang(currentLanguage);
  }, [currentLanguage]);

  // Check saved language on app mount and hook into Google Translate combo
  useEffect(() => {
    const saved = localStorage.getItem('app_selected_locale') || localStorage.getItem('app_locale');
    if (saved) {
      applyDirectionAndLang(saved);
      if (saved !== 'en') {
        setGoogleTranslateCookie(saved);
        let attempts = 0;
        const interval = setInterval(() => {
          attempts += 1;
          const selectElem = document.querySelector('.goog-te-combo');
          const target = GOOGLE_TRANSLATE_LANG_MAP[saved] || saved;
          if (selectElem) {
            if (selectElem.value !== target) {
              selectElem.value = target;
              selectElem.dispatchEvent(new Event('change'));
            }
            clearInterval(interval);
          } else if (attempts > 25) {
            clearInterval(interval);
          }
        }, 200);
      }
    }
  }, []);

  const changeLanguage = async (selectedLang) => {
    if (!selectedLang) return;

    const target = GOOGLE_TRANSLATE_LANG_MAP[selectedLang] || selectedLang;
    setCurrentLanguage(selectedLang);
    localStorage.setItem('app_selected_locale', selectedLang);
    localStorage.setItem('app_locale', selectedLang);

    // Set Google Translate cookie so the whole DOM transforms seamlessly
    setGoogleTranslateCookie(selectedLang);

    // Handle RTL layout if Arabic or Urdu
    applyDirectionAndLang(target);

    // Sync React-i18next
    try {
      await i18n.changeLanguage(selectedLang);
    } catch (e) {
      // Fallback
    }

    // Trigger change event on Google Translate element if mounted, or reload current route smoothly
    const selectElem = document.querySelector('.goog-te-combo');
    if (selectElem) {
      selectElem.value = target;
      selectElem.dispatchEvent(new Event('change'));
    } else {
      window.location.reload();
    }

    // Optional background sync with backend user settings
    try {
      const token = localStorage.getItem('access_token');
      if (token) {
        api.patch('/profile/settings', { preferred_language: selectedLang }).catch(() => {});
      }
    } catch (e) {
      // Ignore background sync errors
    }
  };

  return (
    <LanguageContext.Provider
      value={{
        currentLanguage,
        changeLanguage,
        isRTL,
        t,
        supportedLanguages: SUPPORTED_LANGUAGES,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export default LanguageContext;
