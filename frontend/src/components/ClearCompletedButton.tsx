import { useState } from 'react';
import { useList } from '../context/ListContext';
import { useI18n } from '../context/I18nContext';

const ClearCompletedButton = () => {
  const [isClearing, setIsClearing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { state, clearCompleted } = useList();
  const { t } = useI18n();

  const completedCount = state.list?.items.filter(item => item.completed).length || 0;

  const handleClear = async () => {
    setIsClearing(true);
    try {
      await clearCompleted();
      setShowConfirm(false);
    } catch (error) {
      console.error('Failed to clear completed items:', error);
    } finally {
      setIsClearing(false);
    }
  };

  if (completedCount === 0) {
    return null;
  }

  return (
    <div>
      {showConfirm ? (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex-1 text-center sm:text-left">
            <p className="text-sm font-medium text-red-900 dark:text-red-200">Remove {completedCount} {completedCount === 1 ? t('stats.completedItems') : t('stats.completedItemsPlural')}?</p>
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">This cannot be undone</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleClear}
              disabled={isClearing}
              className="flex-1 sm:flex-none px-4 py-2 bg-red-600 dark:bg-red-500 hover:bg-red-700 dark:hover:bg-red-600 active:bg-red-800 dark:active:bg-red-700 disabled:bg-red-400 dark:disabled:bg-red-800 text-white text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-2"
            >
              {isClearing && (
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              )}
{isClearing ? t('buttons.creating') : t('buttons.delete')}
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              disabled={isClearing}
              className="flex-1 sm:flex-none px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 active:bg-gray-400 dark:active:bg-gray-500 disabled:bg-gray-100 dark:disabled:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-md transition-colors"
            >
{t('buttons.cancel')}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowConfirm(true)}
          className="w-full sm:w-auto px-4 py-2 bg-red-500 dark:bg-red-600 hover:bg-red-600 dark:hover:bg-red-500 active:bg-red-700 dark:active:bg-red-600 text-white text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-2 shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <span className="hidden sm:inline">{t('buttons.clearCompleted')}</span>
          <span className="sm:hidden">{t('buttons.clearCompleted')} {completedCount}</span>
        </button>
      )}
    </div>
  );
};

export default ClearCompletedButton;