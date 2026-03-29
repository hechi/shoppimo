import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import ThemeToggle from './ThemeToggle';
import LanguageSwitcher from './LanguageSwitcher';
import { useI18n } from '../context/I18nContext';

const BurgerMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const { t } = useI18n();

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!menuRef.current?.contains(target) && !sheetRef.current?.contains(target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen]);

  // Lock body scroll on mobile when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const settingsContent = (
    <>
      {/* Theme section */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
          {t('settings.theme', {}, 'Appearance')}
        </label>
        <ThemeToggle />
      </div>

      {/* Divider */}
      <div className="border-t border-gray-100 dark:border-gray-700" />

      {/* Language section */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
          {t('settings.language', {}, 'Language')}
        </label>
        <LanguageSwitcher />
      </div>
    </>
  );

  return (
    <div ref={menuRef} className="relative" data-testid="burger-menu">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-label="Settings menu"
        className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        data-testid="burger-menu-button"
      >
        {isOpen ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {/* Desktop dropdown */}
      {isOpen && (
        <div
          className="hidden md:block absolute right-0 mt-2 w-auto min-w-[240px] bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3 z-30"
          data-testid="burger-menu-panel"
        >
          {settingsContent}
        </div>
      )}

      {/* Mobile bottom sheet — portaled to escape stacking context */}
      {isOpen && createPortal(
        <>
          <div
            className="md:hidden fixed inset-0 bg-black/40 z-40"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div
            ref={sheetRef}
            className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 rounded-t-2xl shadow-2xl animate-slide-up"
            data-testid="burger-menu-panel"
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
            </div>

            {/* Title */}
            <div className="px-5 pt-2 pb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {t('settings.title', {}, 'Settings')}
              </h2>
            </div>

            {/* Settings */}
            <div className="px-5 pb-8 space-y-5">
              {settingsContent}
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
};

export default BurgerMenu;
