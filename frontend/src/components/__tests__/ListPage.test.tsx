import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ListPage from '../ListPage';
import { describe, it, expect, vi } from 'vitest';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual as any,
    useParams: () => ({ listId: '123' })
  };
});

vi.mock('../../context/ListContext', () => ({
  useList: () => ({
    state: { 
      list: { items: [], id: '123' },
      loading: { isLoading: false, error: null },
      conflictNotification: { show: false, message: '' }
    },
    connectionStatus: { isConnected: true, isReconnecting: false, lastError: null },
    syncState: { pendingOperations: 0 },
    loadList: vi.fn(),
    updateItem: vi.fn(),
    deleteItem: vi.fn(),
    toggleItem: vi.fn(),
    dismissConflictNotification: vi.fn()
  })
}));

vi.mock('../../context/I18nContext', () => ({
  useI18n: () => ({
    t: (key: string) => key
  })
}));

vi.mock('../../context/LocalCacheContext', () => ({
  useLocalCache: () => ({
    addRecentList: vi.fn(),
    removeInvalidList: vi.fn(),
    updateItemCount: vi.fn()
  })
}));

vi.mock('../AddItemForm', () => ({ default: () => <div /> }));
vi.mock('../ListItem', () => ({ default: () => <div /> }));
vi.mock('../ShareButton', () => ({ default: () => <div /> }));
vi.mock('../ClearCompletedButton', () => ({ default: () => <div /> }));
vi.mock('../SyncStatusIndicator', () => ({ default: () => <div /> }));
vi.mock('../ConflictNotification', () => ({ default: () => <div /> }));
vi.mock('../LanguageSwitcher', () => ({ default: () => <div /> }));
vi.mock('../ThemeToggle', () => ({ default: () => <div /> }));
vi.mock('../ExpirationIndicator', () => ({ default: () => <div /> }));
vi.mock('../NotificationBell', () => ({ default: () => <div /> }));

describe('ListPage', () => {
  it('has dark mode classes applied', () => {
    const { container } = render(
      <BrowserRouter>
        <ListPage />
      </BrowserRouter>
    );
    
    expect(container.querySelector('.dark\\:from-gray-900')).toBeTruthy();
    expect(container.querySelector('.dark\\:bg-gray-800')).toBeTruthy();
    expect(container.querySelector('.dark\\:text-gray-100')).toBeTruthy();
  });
});