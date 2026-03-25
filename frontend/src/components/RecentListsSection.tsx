import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocalCache } from '../context/LocalCacheContext';
import { useI18n } from '../context/I18nContext';

const RecentListsSection: React.FC = () => {
  const navigate = useNavigate();
  const { recentLists, updateLastAccessed, isLocalStorageAvailable, validateCacheEntry } = useLocalCache();
  const { t } = useI18n();

  const handleListClick = async (listId: string, url: string) => {
    try {
      // Validate cache entry before navigation
      const isValid = await validateCacheEntry(listId);
      if (isValid) {
        updateLastAccessed(listId);
      }
      // Always navigate regardless of validation result
      navigate(url);
    } catch (error) {
      // If validation fails, still navigate to the list
      console.warn('Cache validation failed:', error);
      navigate(url);
    }
  };

  const formatLastAccessed = (lastAccessed: string): string => {
    const date = new Date(lastAccessed);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return t('time.justNow');
    } else if (diffInHours < 24) {
      return t('time.hoursAgo', { hours: diffInHours });
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays === 1) {
        return t('time.yesterday');
      } else if (diffInDays < 7) {
        return t('time.daysAgo', { days: diffInDays });
      } else {
        return date.toLocaleDateString();
      }
    }
  };

  // Don't show the section if localStorage is not available or there are no recent lists
  if (!isLocalStorageAvailable() || recentLists.length === 0) {
    return null;
  }

  return (
    <div className="mt-8 border-t border-gray-200 pt-6" data-testid="recent-lists-section">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        {t('recentLists.title')}
      </h2>
      <div className="space-y-2">
        {recentLists.map((list) => (
          <button
            key={list.id}
            onClick={() => handleListClick(list.id, list.url)}
            className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 hover:border-gray-300"
            data-testid="recent-list-item"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-gray-900 truncate">
                  {list.title}
                </h3>
                <div className="flex items-center mt-1 text-xs text-gray-500 space-x-3">
                  <span className="flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    {list.itemCount} {list.itemCount === 1 ? t('recentLists.item') : t('recentLists.items')}
                  </span>
                  <span className="flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {formatLastAccessed(list.lastAccessed)}
                  </span>
                </div>
              </div>
              <div className="ml-3 flex-shrink-0">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </button>
        ))}
      </div>
      <p className="mt-3 text-xs text-gray-500 text-center">
        {t('recentLists.description')}
      </p>
    </div>
  );
};

export default RecentListsSection;