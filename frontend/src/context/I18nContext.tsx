import React, { createContext, useContext, useState, ReactNode } from 'react';
import enTranslations from '../translations/en.json';
import deTranslations from '../translations/de.json';

type Language = 'en' | 'de';

interface Translations {
  [key: string]: any;
}

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, any>, fallback?: string) => string;
  availableLanguages: { code: Language; name: string }[];
}

const translations: Record<Language, Translations> = {
  en: enTranslations,
  de: deTranslations,
};

const I18nContext = createContext<I18nContextType | undefined>(undefined);

const STORAGE_KEY = 'shopping-list-language';

// Get nested value from object using dot notation (e.g., "app.title")
const getNestedValue = (obj: any, path: string): string | undefined => {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
};

// Detect browser language
const detectBrowserLanguage = (): Language => {
  const browserLang = navigator.language.toLowerCase();
  if (browserLang.startsWith('de')) return 'de';
  return 'en'; // Default to English
};

export const I18nProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    // Try to get language from localStorage first
    const stored = localStorage.getItem(STORAGE_KEY) as Language;
    if (stored && translations[stored]) {
      return stored;
    }
    // Fall back to browser language detection
    return detectBrowserLanguage();
  });

  const availableLanguages = [
    { code: 'en' as Language, name: 'English' },
    { code: 'de' as Language, name: 'Deutsch' },
  ];

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEY, lang);
  };

  const t = (key: string, params?: Record<string, any>, fallback?: string): string => {
    const currentTranslations = translations[language];
    let value = getNestedValue(currentTranslations, key);
    
    if (value === undefined) {
      // Fallback to English if key not found in current language
      if (language !== 'en') {
        value = getNestedValue(translations.en, key);
      }
      
      // Return fallback or the key itself if still not found
      if (value === undefined) {
        return fallback || key;
      }
    }

    // Replace parameters in the string
    if (params && value) {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        value = value?.replace(`{${paramKey}}`, String(paramValue)) || value;
      });
    }

    return value || fallback || key;
  };

  const contextValue: I18nContextType = {
    language,
    setLanguage,
    t,
    availableLanguages,
  };

  return (
    <I18nContext.Provider value={contextValue}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = (): I18nContextType => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};