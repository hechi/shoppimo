import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import ThemeToggle from './ThemeToggle';
import LanguageSwitcher from './LanguageSwitcher';
import { useI18n } from '../context/I18nContext';
import { apiClient } from '../services/api';

interface BurgerMenuProps {
  listId?: string;
  currentAlias?: string | null;
  onAliasChanged?: (alias: string | null) => void;
}

const BurgerMenu: React.FC<BurgerMenuProps> = ({ listId, currentAlias, onAliasChanged }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [aliasInput, setAliasInput] = useState(currentAlias || '');
  const [aliasSaving, setAliasSaving] = useState(false);
  const [aliasError, setAliasError] = useState<string | null>(null);
  const [aliasSuccess, setAliasSuccess] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const { t } = useI18n();

  useEffect(() => {
    setAliasInput(currentAlias || '');
    setAliasError(null);
    setAliasSuccess(null);
  }, [currentAlias, isOpen]);

  const handleAliasSave = async () => {
    if (!listId) return;
    setAliasSaving(true);
    setAliasError(null);
    setAliasSuccess(null);
    try {
      const trimmed = aliasInput.trim().toLowerCase();
      if (trimmed && !/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(trimmed)) {
        setAliasError(t('settings.aliasInvalid'));
        setAliasSaving(false);
        return;
      }
      const newAlias = trimmed || null;
      const updated = await apiClient.updateAlias(listId, newAlias);
      onAliasChanged?.(updated.alias ?? null);
      setAliasSuccess(newAlias ? t('settings.aliasSaved') : t('settings.aliasRemoved'));
      setTimeout(() => setAliasSuccess(null), 2000);
    } catch (error: unknown) {
      const apiError = error as { status?: number };
      if (apiError.status === 409) {
        setAliasError(t('settings.aliasConflict'));
      } else {
        setAliasError(t('messages.somethingWentWrong'));
      }
    } finally {
      setAliasSaving(false);
    }
  };

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
      {listId && (
        <>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
              {t('settings.alias')}
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              {t('settings.aliasDescription')}
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={aliasInput}
                onChange={(e) => {
                  setAliasInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                  setAliasError(null);
                  setAliasSuccess(null);
                }}
                placeholder={t('settings.aliasPlaceholder')}
                maxLength={64}
                className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              />
              <button
                onClick={handleAliasSave}
                disabled={aliasSaving}
                className="px-3 py-2 text-sm bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {aliasSaving ? '...' : (aliasInput.trim() ? t('settings.aliasSave') : t('settings.aliasRemove'))}
              </button>
            </div>
            {aliasError && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{aliasError}</p>
            )}
            {aliasSuccess && (
              <p className="mt-1 text-xs text-green-600 dark:text-green-400">{aliasSuccess}</p>
            )}
          </div>
          <div className="border-t border-gray-100 dark:border-gray-700" />
        </>
      )}

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
