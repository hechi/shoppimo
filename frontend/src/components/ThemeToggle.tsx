import React, { useRef, useEffect, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useI18n } from '../context/I18nContext';

const SunIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m8.66-13.66l-.71.71M4.05 19.95l-.71.71M21 12h-1M4 12H3m16.66 7.66l-.71-.71M4.05 4.05l-.71-.71M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const MoonIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
  </svg>
);

const MonitorIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const ThemeToggle: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const [pillStyle, setPillStyle] = useState<{ left: number; width: number } | null>(null);

  const themeOptions: Array<{
    value: 'light' | 'dark' | 'system';
    label: string;
    testId: string;
    icon: React.ReactNode;
  }> = [
    { value: 'light', label: t('theme.light', {}, 'Light'), testId: 'theme-option-light', icon: <SunIcon /> },
    { value: 'dark', label: t('theme.dark', {}, 'Dark'), testId: 'theme-option-dark', icon: <MoonIcon /> },
    { value: 'system', label: t('theme.system', {}, 'System'), testId: 'theme-option-system', icon: <MonitorIcon /> },
  ];

  // Measure and position the sliding pill behind the active button
  useEffect(() => {
    if (!containerRef.current) return;
    const activeBtn = containerRef.current.querySelector<HTMLButtonElement>(
      `[data-testid="theme-option-${theme}"]`
    );
    if (activeBtn) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const btnRect = activeBtn.getBoundingClientRect();
      setPillStyle({
        left: btnRect.left - containerRect.left,
        width: btnRect.width,
      });
    }
  }, [theme]);

  return (
    <div
      data-testid="theme-toggle"
      ref={containerRef}
      role="radiogroup"
      aria-label={t('theme.label', {}, 'Theme')}
      className="relative flex items-center gap-0.5 p-1 bg-gray-100 rounded-lg shadow-sm dark:bg-gray-700"
    >
      {/* Sliding pill indicator */}
      {pillStyle && (
        <span
          aria-hidden="true"
          className="absolute top-1 h-[calc(100%-0.5rem)] bg-white dark:bg-gray-500 rounded-md shadow-sm transition-all duration-200 ease-in-out"
          style={{ left: pillStyle.left, width: pillStyle.width }}
        />
      )}

      {themeOptions.map((option) => {
        const isActive = theme === option.value;
        return (
          <button
            key={option.value}
            data-testid={option.testId}
            role="radio"
            aria-checked={isActive}
            onClick={() => setTheme(option.value)}
            className={`relative z-10 flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors ${
              isActive
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-100'
                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
            }`}
            title={t('theme.switchTo', { label: option.label }, `Switch to ${option.label} theme`)}
          >
            {option.icon}
            <span className="hidden sm:inline">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default ThemeToggle;
