import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useList } from '../context/ListContext';
import { useI18n } from '../context/I18nContext';
import BurgerMenu from './BurgerMenu';
import RecentListsSection from './RecentListsSection';

const HomePage = () => {
  const navigate = useNavigate();
  const { createList, state } = useList();
  const { t } = useI18n();
  const [showInstructions, setShowInstructions] = useState(false);

  const handleCreateList = async () => {
    try {
      const listId = await createList();
      navigate(`/list/${listId}`);
    } catch (error) {
      console.error('Failed to create list:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="absolute top-4 right-4 z-20">
        <BurgerMenu />
      </div>
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 mt-16 sm:mt-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6 text-center">
          {t('app.title')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8 text-center">
          {t('app.description')}
        </p>
        <button
          onClick={handleCreateList}
          disabled={state.loading.isLoading}
          className="w-full bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-blue-400 dark:disabled:bg-blue-800 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          data-testid="create-list-button"
        >
          {state.loading.isLoading ? t('buttons.creating') : t('buttons.createNewList')}
        </button>
        {state.loading.error && (
          <p className="mt-4 text-red-600 dark:text-red-400 text-sm text-center">
            {state.loading.error}
          </p>
        )}

        <div className="mt-6">
          <button
            onClick={() => setShowInstructions(!showInstructions)}
            className="w-full text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 text-sm font-medium py-2 transition-colors flex items-center justify-center"
          >
            <span>{showInstructions ? t('buttons.hideInstructions') : t('buttons.showInstructions')}</span>
            <svg
              className={`ml-2 h-4 w-4 transform transition-transform ${
                showInstructions ? 'rotate-180' : ''
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showInstructions && (
            <div className="mt-4 space-y-4">
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
                <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">{t('instructions.howToUse')}</h2>
                <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
                  <li className="flex items-start">
                    <span className="font-medium mr-2">1.</span>
                    <span>{t('instructions.step1')}</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-medium mr-2">2.</span>
                    <span>{t('instructions.step2')}</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-medium mr-2">3.</span>
                    <span>{t('instructions.step3')}</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-medium mr-2">4.</span>
                    <span>{t('instructions.step4')}</span>
                  </li>
                </ol>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-900 rounded-lg p-3">
                <p className="text-xs text-yellow-800 dark:text-yellow-200 text-center">
                  <strong>Note:</strong> {t('messages.listCleanupNote')}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Recent Lists Section */}
        <RecentListsSection />
      </div>
    </div>
  );
};

export default HomePage;