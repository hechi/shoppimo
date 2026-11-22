import React, { useState, useRef, useEffect, useId } from 'react';
import ThemeToggle from './ThemeToggle';
import LanguageSwitcher from './LanguageSwitcher';
import { useI18n } from '../context/I18nContext';
import { apiClient } from '../services/api';

interface BurgerMenuProps {
  listId?: string;
  currentAlias?: string | null;
  onAliasChanged?: (alias: string | null) => void;
}

const DESKTOP_QUERY = '(min-width: 768px)';

const useIsDesktop = (): boolean => {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window.matchMedia !== 'function' || window.matchMedia(DESKTOP_QUERY).matches
  );
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia(DESKTOP_QUERY);
    const update = () => setIsDesktop(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return isDesktop;
};

const BurgerMenu: React.FC<BurgerMenuProps> = ({ listId, currentAlias, onAliasChanged }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [aliasInput, setAliasInput] = useState(currentAlias || '');
  const [aliasSaving, setAliasSaving] = useState(false);
  const [aliasError, setAliasError] = useState<string | null>(null);
  const [aliasSuccess, setAliasSuccess] = useState<string | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const popoverId = useId();
  const isDesktop = useIsDesktop();
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

  // Desktop: place the popover under the settings button (top-layer popovers have no containing block)
  const handleBeforeToggle = (e: React.ToggleEvent<HTMLDivElement>) => {
    if (e.newState !== 'open' || !buttonRef.current || !popoverRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    popoverRef.current.style.top = `${rect.bottom + 8}px`;
    popoverRef.current.style.right = `${Math.max(8, window.innerWidth - rect.right)}px`;
  };

  // Mobile: modal bottom sheet. The browser handles focus, Esc, the back gesture and scroll containment.
  const openSheet = () => {
    setIsOpen(true);
    dialogRef.current?.showModal();
  };

  // Light dismiss for browsers without <dialog closedby>: a click on the backdrop targets the dialog itself
  const handleDialogClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const outside =
      e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom;
    if (outside) e.currentTarget.close();
  };

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
                className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
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
    <div className="relative" data-testid="burger-menu">
      <button
        ref={buttonRef}
        type="button"
        {...(isDesktop ? { popoverTarget: popoverId } : { onClick: openSheet })}
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
      {isDesktop ? (
        <div
          ref={popoverRef}
          id={popoverId}
          popover="auto"
          onBeforeToggle={handleBeforeToggle}
          onToggle={(e) => setIsOpen(e.newState === 'open')}
          className="fixed inset-auto m-0 w-auto min-w-[240px] bg-white dark:bg-gray-800 text-inherit rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3"
          data-testid="burger-menu-panel"
        >
          {isOpen && settingsContent}
        </div>
      ) : (
        <dialog
          ref={dialogRef}
          aria-labelledby={`${popoverId}-title`}
          onClose={() => setIsOpen(false)}
          onClick={handleDialogClick}
          className="m-0 mt-auto w-full max-w-full max-h-[90dvh] p-0 bg-white dark:bg-gray-800 text-inherit rounded-t-2xl shadow-2xl backdrop:bg-black/40 open:animate-slide-up"
          data-testid="burger-menu-panel"
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
          </div>
          <div className="px-5 pt-2 pb-4 text-left">
            <h2 id={`${popoverId}-title`} className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {t('settings.title', {}, 'Settings')}
            </h2>
          </div>
          <div className="px-5 pb-[max(2rem,env(safe-area-inset-bottom,0px))] space-y-5 text-left">
            {isOpen && settingsContent}
          </div>
        </dialog>
      )}
    </div>
  );
};

export default BurgerMenu;
