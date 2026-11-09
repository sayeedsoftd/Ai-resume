import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import bn from './locales/bn.json';
import ar from './locales/ar.json';
import hi from './locales/hi.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import zh from './locales/zh.json';
import ja from './locales/ja.json';
import ur from './locales/ur.json';

const resources = {
  en: { translation: en },
  bn: { translation: bn },
  ar: { translation: ar },
  hi: { translation: hi },
  es: { translation: es },
  fr: { translation: fr },
  de: { translation: de },
  zh: { translation: zh },
  ja: { translation: ja },
  ur: { translation: ur },
};

// Retrieve persisted language or default to 'en'
const savedLanguage = (typeof window !== 'undefined' && localStorage.getItem('app_locale')) || 'en';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: savedLanguage,
    fallbackLng: 'en',
    supportedLngs: ['en', 'bn', 'hi', 'ar', 'es', 'fr', 'de', 'zh', 'ja', 'ur'],
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'app_locale',
      caches: ['localStorage'],
    },
  });

export default i18n;
