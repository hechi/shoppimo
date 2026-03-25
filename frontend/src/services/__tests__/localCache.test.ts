import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LocalCacheService } from '../localCache';
import { RecentList } from '../../types';

// Mock localStorage
const localStorageMock = (() => {
  const mock = {
    store: {} as Record<string, string>,
    getItem: vi.fn((key: string) => mock.store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      mock.store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete mock.store[key];
    }),
    clear: vi.fn(() => {
      mock.store = {};
    }),
  };
  return mock;
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('LocalCacheService', () => {
  let cacheService: LocalCacheService;

  beforeEach(() => {
    // Clear localStorage mock
    localStorageMock.clear();
    vi.clearAllMocks();

    // Restore default mock implementations
    localStorageMock.getItem.mockImplementation((key: string) => localStorageMock.store[key] || null);
    localStorageMock.setItem.mockImplementation((key: string, value: string) => {
      localStorageMock.store[key] = value;
    });
    localStorageMock.removeItem.mockImplementation((key: string) => {
      delete localStorageMock.store[key];
    });
    localStorageMock.clear.mockImplementation(() => {
      localStorageMock.store = {};
    });
    
    // Reset the singleton instance by clearing the static property
    (LocalCacheService as any).instance = undefined;
    
    // Get fresh instance
    cacheService = LocalCacheService.getInstance();
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = LocalCacheService.getInstance();
      const instance2 = LocalCacheService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('addRecentList', () => {
    it('should add a new list to cache', () => {
      cacheService.addRecentList('list-1', '/list/list-1', 3, 'Test List');
      
      const recentLists = cacheService.getRecentLists();
      expect(recentLists).toHaveLength(1);
      expect(recentLists[0]).toMatchObject({
        id: 'list-1',
        title: 'Test List',
        url: '/list/list-1',
        itemCount: 3,
      });
      expect(recentLists[0].lastAccessed).toBeDefined();
    });

    it('should generate title when not provided', () => {
      cacheService.addRecentList('list-1', '/list/list-1', 2);
      
      const recentLists = cacheService.getRecentLists();
      expect(recentLists[0].title).toBe('Shopping List (2 items)');
    });

    it('should generate title for single item', () => {
      cacheService.addRecentList('list-1', '/list/list-1', 1);
      
      const recentLists = cacheService.getRecentLists();
      expect(recentLists[0].title).toBe('Shopping List (1 item)');
    });

    it('should generate title for empty list', () => {
      cacheService.addRecentList('list-1', '/list/list-1', 0);
      
      const recentLists = cacheService.getRecentLists();
      expect(recentLists[0].title).toBe('Empty List');
    });

    it('should update existing list instead of duplicating', () => {
      cacheService.addRecentList('list-1', '/list/list-1', 2, 'First Title');
      cacheService.addRecentList('list-1', '/list/list-1', 3, 'Updated Title');
      
      const recentLists = cacheService.getRecentLists();
      expect(recentLists).toHaveLength(1);
      expect(recentLists[0].title).toBe('Updated Title');
      expect(recentLists[0].itemCount).toBe(3);
    });

    it('should add new list at the beginning', () => {
      cacheService.addRecentList('list-1', '/list/list-1', 1, 'First');
      cacheService.addRecentList('list-2', '/list/list-2', 2, 'Second');
      
      const recentLists = cacheService.getRecentLists();
      expect(recentLists[0].title).toBe('Second');
      expect(recentLists[1].title).toBe('First');
    });
  });

  describe('LRU Eviction', () => {
    it('should maintain maximum 10 entries', () => {
      // Add 12 lists
      for (let i = 1; i <= 12; i++) {
        cacheService.addRecentList(`list-${i}`, `/list/list-${i}`, i, `List ${i}`);
      }
      
      const recentLists = cacheService.getRecentLists();
      expect(recentLists).toHaveLength(10);
      
      // Should keep the most recent 10 (list-3 to list-12)
      expect(recentLists[0].title).toBe('List 12');
      expect(recentLists[9].title).toBe('List 3');
    });

    it('should evict oldest entries when limit exceeded', () => {
      // Add 10 lists
      for (let i = 1; i <= 10; i++) {
        cacheService.addRecentList(`list-${i}`, `/list/list-${i}`, i, `List ${i}`);
      }
      
      // Add one more
      cacheService.addRecentList('list-11', '/list/list-11', 11, 'List 11');
      
      const recentLists = cacheService.getRecentLists();
      expect(recentLists).toHaveLength(10);
      
      // List 1 should be evicted
      expect(recentLists.find(list => list.id === 'list-1')).toBeUndefined();
      expect(recentLists.find(list => list.id === 'list-11')).toBeDefined();
    });
  });

  describe('updateLastAccessed', () => {
    it('should update timestamp and move to front', () => {
      cacheService.addRecentList('list-1', '/list/list-1', 1, 'First');
      cacheService.addRecentList('list-2', '/list/list-2', 2, 'Second');
      
      cacheService.updateLastAccessed('list-1');
      
      const recentLists = cacheService.getRecentLists();
      expect(recentLists[0].id).toBe('list-1'); // Should be moved to front
      expect(recentLists[1].id).toBe('list-2');
    });

    it('should do nothing for non-existent list', () => {
      cacheService.addRecentList('list-1', '/list/list-1', 1, 'First');
      
      cacheService.updateLastAccessed('non-existent');
      
      const recentLists = cacheService.getRecentLists();
      expect(recentLists).toHaveLength(1);
      expect(recentLists[0].id).toBe('list-1');
    });
  });

  describe('removeInvalidList', () => {
    it('should remove specified list', () => {
      cacheService.addRecentList('list-1', '/list/list-1', 1, 'First');
      cacheService.addRecentList('list-2', '/list/list-2', 2, 'Second');
      
      cacheService.removeInvalidList('list-1');
      
      const recentLists = cacheService.getRecentLists();
      expect(recentLists).toHaveLength(1);
      expect(recentLists[0].id).toBe('list-2');
    });

    it('should do nothing for non-existent list', () => {
      cacheService.addRecentList('list-1', '/list/list-1', 1, 'First');
      
      cacheService.removeInvalidList('non-existent');
      
      const recentLists = cacheService.getRecentLists();
      expect(recentLists).toHaveLength(1);
    });
  });

  describe('clearCache', () => {
    it('should clear all cached lists', () => {
      cacheService.addRecentList('list-1', '/list/list-1', 1, 'First');
      cacheService.addRecentList('list-2', '/list/list-2', 2, 'Second');
      
      cacheService.clearCache();
      
      const recentLists = cacheService.getRecentLists();
      expect(recentLists).toHaveLength(0);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('shopping-lists-cache');
    });
  });

  describe('updateItemCount', () => {
    it('should update item count for existing list', () => {
      cacheService.addRecentList('list-1', '/list/list-1', 1, 'Test List');
      
      cacheService.updateItemCount('list-1', 5);
      
      const recentLists = cacheService.getRecentLists();
      expect(recentLists[0].itemCount).toBe(5);
    });

    it('should do nothing for non-existent list', () => {
      cacheService.addRecentList('list-1', '/list/list-1', 1, 'Test List');
      
      cacheService.updateItemCount('non-existent', 5);
      
      const recentLists = cacheService.getRecentLists();
      expect(recentLists[0].itemCount).toBe(1);
    });
  });

  describe('validateCacheEntry', () => {
    it('should return true for valid recent entry', async () => {
      cacheService.addRecentList('list-1', '/list/list-1', 1, 'Test List');
      
      const isValid = await cacheService.validateCacheEntry('list-1');
      expect(isValid).toBe(true);
    });

    it('should return false for non-existent entry', async () => {
      const isValid = await cacheService.validateCacheEntry('non-existent');
      expect(isValid).toBe(false);
    });

    it('should remove and return false for old entries', async () => {
      // Add a list with old timestamp
      cacheService.addRecentList('list-1', '/list/list-1', 1, 'Test List');
      
      // Manually set old timestamp (31 days ago)
      const recentLists = cacheService.getRecentLists();
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 31);
      recentLists[0].lastAccessed = oldDate.toISOString();
      
      // Manually update cache to simulate old entry
      localStorageMock.setItem('shopping-lists-cache', JSON.stringify({
        recentLists: recentLists,
        version: '1.0'
      }));
      
      const isValid = await cacheService.validateCacheEntry('list-1');
      expect(isValid).toBe(false);
      
      // Entry should be removed
      const updatedLists = cacheService.getRecentLists();
      expect(updatedLists).toHaveLength(0);
    });
  });

  describe('localStorage Error Handling', () => {
    it('should handle localStorage getItem errors', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });
      
      // Should not throw and return empty array
      const recentLists = cacheService.getRecentLists();
      expect(recentLists).toHaveLength(0);
    });

    it('should handle localStorage setItem quota exceeded error', () => {
      const quotaError = new DOMException('Quota exceeded', 'QuotaExceededError');
      localStorageMock.setItem.mockImplementation(() => {
        throw quotaError;
      });
      
      // Should clear cache when quota exceeded
      cacheService.addRecentList('list-1', '/list/list-1', 1, 'Test');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('shopping-lists-cache');
    });

    it('should handle localStorage setItem other errors', () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Other localStorage error');
      });
      
      // Should not throw
      expect(() => {
        cacheService.addRecentList('list-1', '/list/list-1', 1, 'Test');
      }).not.toThrow();
    });
  });

  describe('isLocalStorageAvailable', () => {
    it('should return true when localStorage is available', () => {
      // Reset localStorage mock to not throw errors
      localStorageMock.setItem.mockImplementation((key: string, value: string) => {
        (localStorageMock as any).store[key] = value;
      });
      localStorageMock.removeItem.mockImplementation((key: string) => {
        delete (localStorageMock as any).store[key];
      });
      
      expect(cacheService.isLocalStorageAvailable()).toBe(true);
    });

    it('should return false when localStorage throws error', () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('localStorage not available');
      });
      
      expect(cacheService.isLocalStorageAvailable()).toBe(false);
    });
  });

  describe('getCacheStats', () => {
    it('should return correct cache statistics', () => {
      cacheService.addRecentList('list-1', '/list/list-1', 1, 'First');
      cacheService.addRecentList('list-2', '/list/list-2', 2, 'Second');
      
      const stats = cacheService.getCacheStats();
      expect(stats).toEqual({
        totalEntries: 2,
        maxEntries: 10,
        version: '1.0'
      });
    });
  });

  describe('Version Management', () => {
    it('should clear cache on version mismatch', () => {
      // Reset localStorage mock to not throw errors
      localStorageMock.setItem.mockImplementation((key: string, value: string) => {
        (localStorageMock as any).store[key] = value;
      });
      
      // Simulate old version in localStorage
      localStorageMock.setItem('shopping-lists-cache', JSON.stringify({
        recentLists: [{ id: 'old-list', title: 'Old', url: '/old', lastAccessed: new Date().toISOString(), itemCount: 1 }],
        version: '0.9'
      }));
      
      // Reset singleton and create new instance to trigger version check
      (LocalCacheService as any).instance = undefined;
      const newService = LocalCacheService.getInstance();
      
      const recentLists = newService.getRecentLists();
      expect(recentLists).toHaveLength(0);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('shopping-lists-cache');
    });

    it('should handle invalid cache structure', () => {
      // Reset localStorage mock to not throw errors
      localStorageMock.setItem.mockImplementation((key: string, value: string) => {
        (localStorageMock as any).store[key] = value;
      });
      
      // Simulate invalid structure in localStorage
      localStorageMock.setItem('shopping-lists-cache', JSON.stringify({
        recentLists: 'invalid-structure',
        version: '1.0'
      }));
      
      // Reset singleton and create new instance to trigger structure validation
      (LocalCacheService as any).instance = undefined;
      const newService = LocalCacheService.getInstance();
      
      const recentLists = newService.getRecentLists();
      expect(recentLists).toHaveLength(0);
    });

    it('should filter out invalid entries during load', () => {
      // Reset localStorage mock to not throw errors
      localStorageMock.setItem.mockImplementation((key: string, value: string) => {
        (localStorageMock as any).store[key] = value;
      });
      
      // Simulate mixed valid/invalid entries
      localStorageMock.setItem('shopping-lists-cache', JSON.stringify({
        recentLists: [
          { id: 'valid', title: 'Valid', url: '/valid', lastAccessed: new Date().toISOString(), itemCount: 1 },
          { id: 'invalid', title: 'Invalid' }, // Missing required fields
          { id: 'valid2', title: 'Valid2', url: '/valid2', lastAccessed: new Date().toISOString(), itemCount: 2 }
        ],
        version: '1.0'
      }));
      
      // Reset singleton and create new instance to trigger validation
      (LocalCacheService as any).instance = undefined;
      const newService = LocalCacheService.getInstance();
      
      const recentLists = newService.getRecentLists();
      expect(recentLists).toHaveLength(2);
      expect(recentLists.find(list => list.id === 'invalid')).toBeUndefined();
    });
  });
});