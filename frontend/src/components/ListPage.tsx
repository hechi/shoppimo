import { useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { useList } from '../context/ListContext';
import { useI18n } from '../context/I18nContext';
import { useLocalCache } from '../context/LocalCacheContext';
import AddItemForm from './AddItemForm';
import ListItem from './ListItem';
import ShareButton from './ShareButton';
import NotificationBell from './NotificationBell';
import ClearCompletedButton from './ClearCompletedButton';
import SyncStatusIndicator from './SyncStatusIndicator';
import ConflictNotification from './ConflictNotification';
import BurgerMenu from './BurgerMenu';
import ExpirationIndicator from './ExpirationIndicator';

const ListPage = () => {
  const { listId } = useParams<{ listId: string }>();
  const { state, connectionStatus, syncState, loadList, updateItem, deleteItem, toggleItem, dismissConflictNotification } = useList();
  const { t } = useI18n();
  const { addRecentList, removeInvalidList, updateItemCount } = useLocalCache();

  useEffect(() => {
    if (listId) {
      loadList(listId);
    }
  }, [listId, loadList]);

  // Cache list metadata when successfully loaded
  useEffect(() => {
    if (listId && state.list && !state.loading.isLoading && !state.loading.error) {
      const generateListTitle = (items: any[]) => {
        if (!items || items.length === 0) {
          return 'Empty List';
        }
        
        // Try to create a title from first few items
        const firstItems = items.slice(0, 3).map(item => item.text);
        if (firstItems.length === 1) {
          return firstItems[0];
        } else if (firstItems.length <= 3) {
          return firstItems.join(', ');
        } else {
          return `${firstItems.slice(0, 2).join(', ')} & more`;
        }
      };

      const title = generateListTitle(state.list.items);
      const url = `/list/${listId}`;
      const itemCount = state.list.items?.length || 0;
      
      addRecentList(listId, url, itemCount, title);
    }
  }, [listId, state.list, state.loading.isLoading, state.loading.error, addRecentList]);

  // Handle cache cleanup for 404 responses
  useEffect(() => {
    if (listId && state.loading.error && state.loading.error.includes('404')) {
      removeInvalidList(listId);
    }
  }, [listId, state.loading.error, removeInvalidList]);

  // Update item count when list items change
  useEffect(() => {
    if (listId && state.list && !state.loading.isLoading) {
      const itemCount = state.list.items?.length || 0;
      updateItemCount(listId, itemCount);
    }
  }, [listId, state.list?.items?.length, state.loading.isLoading, updateItemCount]);

  if (!listId) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">{t('messages.invalidList')}</h1>
          <p className="text-gray-600 dark:text-gray-400">{t('messages.invalidListDescription')}</p>
        </div>
      </div>
    );
  }

  if (state.loading.isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">{t('messages.loadingList')}</p>
        </div>
      </div>
    );
  }

  if (state.loading.error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">{t('messages.errorLoadingList')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{state.loading.error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => loadList(listId)}
              className="px-4 py-2 bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-lg transition-colors"
            >
{t('buttons.tryAgain')}
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="px-4 py-2 bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
            >
{t('buttons.goHome')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!state.list) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-600 dark:text-gray-400 mb-4">{t('messages.listNotFound')}</h1>
          <p className="text-gray-600 dark:text-gray-400">{t('messages.listNotFoundDescription')}</p>
        </div>
      </div>
    );
  }

  const showStickyStatus = !connectionStatus.isConnected || 
                            connectionStatus.isReconnecting || 
                            syncState.pendingOperations > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 dark:from-gray-900 to-gray-100 dark:to-gray-800">
      {/* Sticky Status Bar - Only shown when disconnected or has pending changes */}
      {showStickyStatus && (
        <div className="fixed top-0 left-0 right-0 z-30 bg-white dark:bg-gray-800 shadow-md border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-2xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <SyncStatusIndicator 
                connectionStatus={connectionStatus} 
                syncState={syncState} 
              />
              {!connectionStatus.isConnected && !connectionStatus.isReconnecting && (
                <button
                  onClick={() => window.location.reload()}
                  className="px-3 py-1 bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white text-xs rounded-md transition-colors"
                >
                  {t('buttons.reconnect')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      
      <div className="absolute top-3 right-3 z-20 sm:top-4 sm:right-4">
        <BurgerMenu />
      </div>
      <ConflictNotification
        show={state.conflictNotification.show}
        message={state.conflictNotification.message}
        onDismiss={dismissConflictNotification}
      />
      <div className={`max-w-2xl mx-auto py-4 md:py-8 px-3 md:px-4 ${showStickyStatus ? 'pt-20 sm:pt-20' : 'pt-16 sm:pt-8'}`}>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700/50 overflow-hidden">
          {/* Header */}
          <div className="p-4 md:p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 dark:from-blue-600 to-blue-600 dark:to-blue-700 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">{t('app.title')}</h1>
                  <SyncStatusIndicator 
                    connectionStatus={connectionStatus} 
                    syncState={syncState} 
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <NotificationBell listId={listId} />
                <ShareButton listId={listId} />
              </div>
            </div>

            {/* AddItemForm: visible in header on desktop, hidden on mobile (shown at bottom instead) */}
            <div className="hidden md:block">
              <AddItemForm />
            </div>
            
            {/* Expiration Indicator */}
            {state.list?.expiresAt && (
              <div className="mt-4">
                <ExpirationIndicator expiresAt={state.list.expiresAt} />
              </div>
            )}
            
            {/* Connection Error Display */}
            {connectionStatus.lastError && (
              <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950 border-l-4 border-amber-400 dark:border-amber-500 rounded-r-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <p className="text-sm text-amber-800 dark:text-amber-200">{t('messages.connectionIssue')}</p>
                  </div>
                  {!connectionStatus.isConnected && !connectionStatus.isReconnecting && (
                    <button
                      onClick={() => window.location.reload()}
                      className="px-3 py-1 bg-amber-600 dark:bg-amber-500 hover:bg-amber-700 dark:hover:bg-amber-600 text-white text-xs rounded-md transition-colors"
                    >
{t('buttons.reconnect')}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Error Display */}
            {state.loading.error && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-950 border-l-4 border-red-400 dark:border-red-500 rounded-r-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm text-red-800 dark:text-red-200">{t('messages.somethingWentWrong')}</p>
                  </div>
                  <button
                    onClick={() => loadList(listId)}
                    className="px-3 py-1 bg-red-600 dark:bg-red-500 hover:bg-red-700 dark:hover:bg-red-600 text-white text-xs rounded-md transition-colors"
                  >
{t('buttons.retry')}
                  </button>
                </div>
              </div>
            )}

            {/* Offline Mode Notice */}
            {!connectionStatus.isConnected && !connectionStatus.isReconnecting && (
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 border-l-4 border-blue-400 dark:border-blue-500 rounded-r-lg">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100">{t('messages.workingOffline')}</p>
                    <p className="text-xs text-blue-700 dark:text-blue-300">{t('messages.changesWillSync')}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* List Items */}
          <div className="p-4 md:p-6">
            <div className="space-y-2 mb-6">
              {!state.list || !state.list.items || state.list.items.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-100 dark:from-blue-900 to-blue-200 dark:to-blue-800 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">{t('messages.readyToStartShopping')}</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-sm mx-auto">{t('messages.addFirstItem')}</p>
                  <div className="flex items-center justify-center gap-6 text-sm text-gray-500 dark:text-gray-500">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      <span>{t('features.realTimeSync')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                      <span>{t('features.collaborative')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                      <span>{t('features.easySharing')}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* List Statistics */}
                  <div className="flex items-center justify-between mb-6 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <div className="flex items-center gap-6 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-gray-400 dark:bg-gray-600 rounded-full"></div>
                        <span className="text-gray-600 dark:text-gray-400" data-testid="stats-total">{state.list?.items?.length || 0} {t('stats.total')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-gray-600 dark:text-gray-400" data-testid="stats-done">{state.list?.items?.filter(item => item.completed).length || 0} {t('stats.done')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="text-gray-600 dark:text-gray-400" data-testid="stats-left">{state.list?.items?.filter(item => !item.completed).length || 0} {t('stats.left')}</span>
                      </div>
                    </div>
                    {state.list?.items?.length > 0 && (
                      <div className="text-xs text-gray-500 dark:text-gray-500">
{Math.round(((state.list?.items?.filter(item => item.completed).length || 0) / (state.list?.items?.length || 1)) * 100)}% {t('stats.complete')}
                      </div>
                    )}
                  </div>

                  {/* Items List */}
                  {state.list?.items
                    ?.sort((a, b) => a.order - b.order)
                    .map(item => (
                      <ListItem
                        key={item.id}
                        item={item}
                        onUpdate={updateItem}
                        onDelete={deleteItem}
                        onToggle={toggleItem}
                      />
                    ))}
                </>
              )}
            </div>

            {/* Bulk Operations */}
            {state.list?.items?.some(item => item.completed) && (
              <div className="border-t border-gray-100 dark:border-gray-800 pt-6 mt-6">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500 dark:text-gray-500">
{state.list?.items?.filter(item => item.completed).length} {state.list?.items?.filter(item => item.completed).length === 1 ? t('stats.completedItems') : t('stats.completedItemsPlural')}
                  </div>
                  <ClearCompletedButton />
                </div>
              </div>
            )}
          </div>
        </div>
        {/* Spacer for mobile sticky input */}
        <div className="h-24 md:hidden" />
      </div>

      {/* Mobile sticky bottom AddItemForm */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-20 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-3 py-3 shadow-[0_-2px_10px_rgba(0,0,0,0.08)]">
        <AddItemForm />
      </div>
    </div>
  );
};

export default ListPage;