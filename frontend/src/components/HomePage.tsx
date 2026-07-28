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
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="absolute top-4 right-4 z-20">
        <BurgerMenu />
      </div>
      <div className="max-w-md w-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm ring-1 ring-gray-200/70 dark:ring-gray-700/60 rounded-3xl shadow-card p-8 mt-16 sm:mt-8 animate-scale-in">
        <div className="flex justify-center mb-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lift flex items-center justify-center">
            <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight mb-3 text-center bg-gradient-to-r from-blue-600 to-blue-800 dark:from-blue-400 dark:to-blue-500 bg-clip-text text-transparent">
          {t('app.title')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8 text-center leading-relaxed">
          {t('app.description')}
        </p>
        <button
          onClick={handleCreateList}
          disabled={state.loading.isLoading}
          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-blue-400 disabled:to-blue-400 dark:disabled:from-blue-800 dark:disabled:to-blue-800 text-white font-semibold py-3.5 px-4 rounded-xl shadow-lift hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:shadow-none disabled:translate-y-0"
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