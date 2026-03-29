import React from 'react';
import { useI18n } from '../context/I18nContext';

const GlobeIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
  </svg>
);

const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage, availableLanguages } = useI18n();

  return (
    <div
      role="radiogroup"
      aria-label="Language"
      className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-700 rounded-lg"
    >
      {availableLanguages.map((lang) => {
        const isActive = language === lang.code;
        return (
          <button
            key={lang.code}
            role="radio"
            aria-checked={isActive}
            onClick={() => setLanguage(lang.code)}
            className={`relative flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              isActive
                ? 'bg-white dark:bg-gray-500 text-blue-700 dark:text-blue-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
            title={lang.name}
          >
            {isActive && <GlobeIcon />}
            {lang.name}
          </button>
        );
      })}
    </div>
  );
};

export default LanguageSwitcher;
