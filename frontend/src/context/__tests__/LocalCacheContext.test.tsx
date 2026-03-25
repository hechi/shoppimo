import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '../../test/test-utils';
import { LocalCacheProvider, useLocalCache } from '../LocalCacheContext';
import { localCacheService } from '../../services/localCache';

// Mock the localCacheService
vi.mock('../../services/localCache', () => ({
  localCacheService: {
    getRecentLists: vi.fn(),
    addRecentList: vi.fn(),
    updateLastAccessed: vi.fn(),
    removeInvalidList: vi.fn(),
    clearCache: vi.fn(),
    updateItemCount: vi.fn(),
    validateCacheEntry: vi.fn(),
    isLocalStorageAvailable: vi.fn(),
    getCacheStats: vi.fn(),
  },
}));

const mockLocalCacheService = localCacheService as any;

// Test component to access the context
const TestComponent = () => {
  const {
    recentLists,
    addRecentList,
    updateLastAccessed,
    removeInvalidList,
    clearCache,
    updateItemCount,
    refreshCache,
    validateCacheEntry,
    isLocalStorageAvailable,
    getCacheStats,
  } = useLocalCache();

  return (
    <div>
      <div data-testid="recent-lists-count">{recentLists.length}</div>
      <button onClick={() => addRecentList('test-id', '/test', 1, 'Test List')}>
        Add Recent List
      </button>
      <button onClick={() => updateLastAccessed('test-id')}>
        Update Last Accessed
      </button>
      <button onClick={() => removeInvalidList('test-id')}>
        Remove Invalid List
      </button>
      <button onClick={() => clearCache()}>
        Clear Cache
      </button>
      <button onClick={() => updateItemCount('test-id', 5)}>
        Update Item Count
      </button>
      <button onClick={() => refreshCache()}>
        Refresh Cache
      </button>
      <button onClick={async () => {
        const isValid = await validateCacheEntry('test-id');
        const validationResult = document.createElement('div');
        validationResult.setAttribute('data-testid', 'validation-result');
        validationResult.textContent = isValid.toString();
        document.body.appendChild(validationResult);
      }}>
        Validate Cache Entry
      </button>
      <button onClick={() => {
        const available = isLocalStorageAvailable();
        const availabilityResult = document.createElement('div');
        availabilityResult.setAttribute('data-testid', 'availability-result');
        availabilityResult.textContent = available.toString();
        document.body.appendChild(availabilityResult);
      }}>
        Check LocalStorage
      </button>
      <button onClick={() => {
        const stats = getCacheStats();
        const statsResult = document.createElement('div');
        statsResult.setAttribute('data-testid', 'stats-result');
        statsResult.textContent = JSON.stringify(stats);
        document.body.appendChild(statsResult);
      }}>
        Get Cache Stats
      </button>
    </div>
  );
};

describe('LocalCacheContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalCacheService.getRecentLists.mockReturnValue([]);
    mockLocalCacheService.isLocalStorageAvailable.mockReturnValue(true);
    mockLocalCacheService.validateCacheEntry.mockResolvedValue(true);
    mockLocalCacheService.getCacheStats.mockReturnValue({
      totalEntries: 0,
      maxEntries: 10,
      version: '1.0'
    });
  });

  afterEach(() => {
    // Clean up any dynamically created elements
    const validationResult = document.querySelector('[data-testid="validation-result"]');
    const availabilityResult = document.querySelector('[data-testid="availability-result"]');
    const statsResult = document.querySelector('[data-testid="stats-result"]');
    
    if (validationResult) validationResult.remove();
    if (availabilityResult) availabilityResult.remove();
    if (statsResult) statsResult.remove();
  });

  it('should provide initial empty recent lists', () => {
    render(
      <LocalCacheProvider>
        <TestComponent />
      </LocalCacheProvider>
    );

    expect(screen.getByTestId('recent-lists-count')).toHaveTextContent('0');
    expect(mockLocalCacheService.getRecentLists).toHaveBeenCalled();
  });

  it('should provide recent lists from service', () => {
    const mockLists = [
      {
        id: 'list-1',
        title: 'Test List',
        url: '/list/list-1',
        lastAccessed: new Date().toISOString(),
        itemCount: 3
      }
    ];
    mockLocalCacheService.getRecentLists.mockReturnValue(mockLists);

    render(
      <LocalCacheProvider>
        <TestComponent />
      </LocalCacheProvider>
    );

    expect(screen.getByTestId('recent-lists-count')).toHaveTextContent('1');
  });

  it('should call addRecentList and refresh cache', async () => {
    render(
      <LocalCacheProvider>
        <TestComponent />
      </LocalCacheProvider>
    );

    const addButton = screen.getByText('Add Recent List');
    
    await act(async () => {
      addButton.click();
    });

    expect(mockLocalCacheService.addRecentList).toHaveBeenCalledWith(
      'test-id',
      '/test',
      1,
      'Test List'
    );
    expect(mockLocalCacheService.getRecentLists).toHaveBeenCalledTimes(2); // Initial + refresh
  });

  it('should call updateLastAccessed and refresh cache', async () => {
    render(
      <LocalCacheProvider>
        <TestComponent />
      </LocalCacheProvider>
    );

    const updateButton = screen.getByText('Update Last Accessed');
    
    await act(async () => {
      updateButton.click();
    });

    expect(mockLocalCacheService.updateLastAccessed).toHaveBeenCalledWith('test-id');
    expect(mockLocalCacheService.getRecentLists).toHaveBeenCalledTimes(2); // Initial + refresh
  });

  it('should call removeInvalidList and refresh cache', async () => {
    render(
      <LocalCacheProvider>
        <TestComponent />
      </LocalCacheProvider>
    );

    const removeButton = screen.getByText('Remove Invalid List');
    
    await act(async () => {
      removeButton.click();
    });

    expect(mockLocalCacheService.removeInvalidList).toHaveBeenCalledWith('test-id');
    expect(mockLocalCacheService.getRecentLists).toHaveBeenCalledTimes(2); // Initial + refresh
  });

  it('should call clearCache and refresh cache', async () => {
    render(
      <LocalCacheProvider>
        <TestComponent />
      </LocalCacheProvider>
    );

    const clearButton = screen.getByText('Clear Cache');
    
    await act(async () => {
      clearButton.click();
    });

    expect(mockLocalCacheService.clearCache).toHaveBeenCalled();
    expect(mockLocalCacheService.getRecentLists).toHaveBeenCalledTimes(2); // Initial + refresh
  });

  it('should call updateItemCount and refresh cache', async () => {
    render(
      <LocalCacheProvider>
        <TestComponent />
      </LocalCacheProvider>
    );

    const updateCountButton = screen.getByText('Update Item Count');
    
    await act(async () => {
      updateCountButton.click();
    });

    expect(mockLocalCacheService.updateItemCount).toHaveBeenCalledWith('test-id', 5);
    expect(mockLocalCacheService.getRecentLists).toHaveBeenCalledTimes(2); // Initial + refresh
  });

  it('should call refreshCache manually', async () => {
    render(
      <LocalCacheProvider>
        <TestComponent />
      </LocalCacheProvider>
    );

    const refreshButton = screen.getByText('Refresh Cache');
    
    await act(async () => {
      refreshButton.click();
    });

    expect(mockLocalCacheService.getRecentLists).toHaveBeenCalledTimes(2); // Initial + manual refresh
  });

  it('should call validateCacheEntry', async () => {
    mockLocalCacheService.validateCacheEntry.mockResolvedValue(true);

    render(
      <LocalCacheProvider>
        <TestComponent />
      </LocalCacheProvider>
    );

    const validateButton = screen.getByText('Validate Cache Entry');
    
    await act(async () => {
      validateButton.click();
    });

    expect(mockLocalCacheService.validateCacheEntry).toHaveBeenCalledWith('test-id');
    
    // Wait for async operation to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    const validationResult = document.querySelector('[data-testid="validation-result"]');
    expect(validationResult?.textContent).toBe('true');
  });

  it('should call isLocalStorageAvailable', async () => {
    mockLocalCacheService.isLocalStorageAvailable.mockReturnValue(false);

    render(
      <LocalCacheProvider>
        <TestComponent />
      </LocalCacheProvider>
    );

    const checkButton = screen.getByText('Check LocalStorage');
    
    await act(async () => {
      checkButton.click();
    });

    expect(mockLocalCacheService.isLocalStorageAvailable).toHaveBeenCalled();
    
    const availabilityResult = document.querySelector('[data-testid="availability-result"]');
    expect(availabilityResult?.textContent).toBe('false');
  });

  it('should call getCacheStats', async () => {
    const mockStats = { totalEntries: 5, maxEntries: 10, version: '1.0' };
    mockLocalCacheService.getCacheStats.mockReturnValue(mockStats);

    render(
      <LocalCacheProvider>
        <TestComponent />
      </LocalCacheProvider>
    );

    const statsButton = screen.getByText('Get Cache Stats');
    
    await act(async () => {
      statsButton.click();
    });

    expect(mockLocalCacheService.getCacheStats).toHaveBeenCalled();
    
    const statsResult = document.querySelector('[data-testid="stats-result"]');
    expect(statsResult?.textContent).toBe(JSON.stringify(mockStats));
  });

  it('should throw error when used outside provider', () => {
    // Suppress console.error for this test
    const originalError = console.error;
    console.error = vi.fn();

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useLocalCache must be used within a LocalCacheProvider');

    console.error = originalError;
  });
});