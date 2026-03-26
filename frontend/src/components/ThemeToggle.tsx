import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { useI18n } from '../context/I18nContext';

const ThemeToggle: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const { t } = useI18n();

  const themeOptions: Array<{ value: 'light' | 'dark' | 'system'; label: string; testId: string }> = [
    { value: 'light', label: t('theme.light', {}, 'Light'), testId: 'theme-option-light' },
    { value: 'dark', label: t('theme.dark', {}, 'Dark'), testId: 'theme-option-dark' },
    { value: 'system', label: t('theme.system', {}, 'System'), testId: 'theme-option-system' },
  ];

  return (
    <div 
      data-testid="theme-toggle"
      className="flex items-center gap-1 sm:gap-2 px-2 py-1.5 sm:px-3 sm:py-2 bg-white/80 backdrop-blur-sm rounded-lg shadow-sm dark:bg-gray-700"
    >
      {themeOptions.map((option) => (
        <button
          key={option.value}
          data-testid={option.testId}
          onClick={() => setTheme(option.value)}
          className={`px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium rounded transition-colors ${
            theme === option.value
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-100'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-gray-100 dark:hover:bg-gray-600'
          }`}
          title={t('theme.switchTo', { label: option.label }, `Switch to ${option.label} theme`)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};

export default ThemeToggle;
