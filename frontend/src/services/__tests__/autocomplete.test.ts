import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AutocompleteService } from '../autocomplete';

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

describe('AutocompleteService', () => {
  let service: AutocompleteService;

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

    // Reset the singleton instance
    (AutocompleteService as any).instance = undefined;

    // Get fresh instance
    service = AutocompleteService.getInstance();
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = AutocompleteService.getInstance();
      const instance2 = AutocompleteService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('addItem', () => {
    it("should add item 'Milk' and store in localStorage", () => {
      service.addItem('Milk');

      const suggestions = service.getSuggestions('milk');
      expect(suggestions).toContain('Milk');
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('should store item with metadata in localStorage', () => {
      service.addItem('Milk');

      const stored = localStorageMock.store['shoppimo_autocomplete_history'];
      expect(stored).toBeDefined();
      const parsed = JSON.parse(stored!);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed[0]).toMatchObject({
        text: 'Milk',
        normalizedText: 'milk',
      });
      expect(parsed[0].lastUsed).toBeDefined();
    });

    it('should update lastUsed timestamp when adding existing item', () => {
      service.addItem('Milk');
      const initial = service.getHistorySize();
      expect(initial).toBe(1);

      // Add same item again
      service.addItem('Milk');

      // Should still be 1 (deduplicated)
      expect(service.getHistorySize()).toBe(1);
    });

    it('should preserve original casing while normalizing for deduplication', () => {
      service.addItem('MiLk');

      const suggestions = service.getSuggestions('milk');
      expect(suggestions[0]).toBe('MiLk');
    });
  });

  describe('getSuggestions', () => {
    it("should return ['Milk'] for prefix 'mi'", () => {
      service.addItem('Milk');

      const suggestions = service.getSuggestions('mi');
      expect(suggestions).toEqual(['Milk']);
    });

    it('should perform case-insensitive prefix matching', () => {
      service.addItem('Milk');

      expect(service.getSuggestions('MI')).toEqual(['Milk']);
      expect(service.getSuggestions('mi')).toEqual(['Milk']);
      expect(service.getSuggestions('Mi')).toEqual(['Milk']);
      expect(service.getSuggestions('milk')).toEqual(['Milk']);
    });

    it('should return empty array for empty prefix', () => {
      service.addItem('Milk');

      const suggestions = service.getSuggestions('');
      expect(suggestions).toEqual([]);
    });

    it('should return empty array for prefix with no matches', () => {
      service.addItem('Milk');

      const suggestions = service.getSuggestions('xyz');
      expect(suggestions).toEqual([]);
    });

    it('should limit results to 3 when limit parameter is 3', () => {
      service.addItem('Milk');
      service.addItem('Mozzarella');
      service.addItem('Mango');
      service.addItem('Mushroom');
      service.addItem('Melon');

      const suggestions = service.getSuggestions('m', 3);
      expect(suggestions).toHaveLength(3);
    });

    it('should use default limit of 8 when limit is not provided', () => {
      for (let i = 0; i < 10; i++) {
        service.addItem(`Item${i}`);
      }

      const suggestions = service.getSuggestions('Item');
      expect(suggestions.length).toBeLessThanOrEqual(8);
    });

    it('should sort results by lastUsed timestamp descending', () => {
      service.addItem('Apple');
      service.addItem('Apricot');
      service.addItem('Avocado');

      // Re-access Apple to make it most recent
      service.addItem('Apple');

      const suggestions = service.getSuggestions('a');
      expect(suggestions[0]).toBe('Apple');
    });

    it('should match multiple items with same prefix', () => {
      service.addItem('Milk');
      service.addItem('Mozzarella');
      service.addItem('Mango');

      const suggestions = service.getSuggestions('m');
      expect(suggestions).toHaveLength(3);
      expect(suggestions).toContain('Milk');
      expect(suggestions).toContain('Mozzarella');
      expect(suggestions).toContain('Mango');
    });
  });

  describe('Deduplication', () => {
    it("should deduplicate 'Milk' then 'milk' - only one entry", () => {
      service.addItem('Milk');
      service.addItem('milk');

      expect(service.getHistorySize()).toBe(1);
    });

    it("should keep most recent casing when updating item 'MiLk' to 'milk'", () => {
      service.addItem('MiLk');
      service.addItem('milk');

      const suggestions = service.getSuggestions('milk');
      expect(suggestions[0]).toBe('milk');
    });

    it('should preserve original casing if item not updated', () => {
      service.addItem('MiLk');

      const suggestions = service.getSuggestions('milk');
      expect(suggestions[0]).toBe('MiLk');
    });

    it('should match on normalizedText, not exact text', () => {
      service.addItem('Milk');
      service.addItem('MILK');

      // Should only have one entry despite different casings
      expect(service.getHistorySize()).toBe(1);
      expect(service.getSuggestions('milk')).toHaveLength(1);
    });
  });

  describe('LRU Eviction', () => {
    it('should maintain maximum 500 items', () => {
      for (let i = 1; i <= 510; i++) {
        service.addItem(`Item${i}`);
      }

      expect(service.getHistorySize()).toBe(500);
    });

    it('should evict oldest item when adding 501st item', () => {
      for (let i = 1; i <= 501; i++) {
        service.addItem(`Item${i}`);
      }

      expect(service.getHistorySize()).toBe(500);

      // Item1 should be gone (only Items 2-501 remain)
      const suggestionsItem1 = service.getSuggestions('Item1$');
      expect(suggestionsItem1).not.toContain('Item1');

      // Item501 should be present
      const suggestions501 = service.getSuggestions('Item501');
      expect(suggestions501).toContain('Item501');
    });

    it('should count stays at 500 after adding 501 items', () => {
      for (let i = 1; i <= 501; i++) {
        service.addItem(`Item${i}`);
      }

      expect(service.getHistorySize()).toBe(500);
    });

    it('should evict the one with OLDEST lastUsed timestamp', () => {
      // Add items
      service.addItem('First');
      service.addItem('Second');
      service.addItem('Third');

      // Touch "First" to make it recent
      service.addItem('First');

      // Add items to reach near 500
      for (let i = 4; i <= 500; i++) {
        service.addItem(`Item${i}`);
      }

      // Now add one more to trigger eviction
      service.addItem('Item501');

      // "Second" should be evicted (oldest not accessed since original add)
      const suggestions = service.getSuggestions('second');
      expect(suggestions).toEqual([]);

      // "First" should still be there (was re-added, so more recent)
      const suggestionsFirst = service.getSuggestions('first');
      expect(suggestionsFirst).toContain('First');
    });
  });

  describe('clearHistory', () => {
    it('should remove all items', () => {
      service.addItem('Milk');
      service.addItem('Cheese');

      service.clearHistory();

      expect(service.getHistorySize()).toBe(0);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('shoppimo_autocomplete_history');
    });

    it('should clear localStorage completely', () => {
      service.addItem('Milk');

      service.clearHistory();

      expect(localStorageMock.store['shoppimo_autocomplete_history']).toBeUndefined();
    });

    it('should handle clearing empty history', () => {
      service.clearHistory();

      expect(service.getHistorySize()).toBe(0);
      expect(() => service.clearHistory()).not.toThrow();
    });
  });

  describe('getHistorySize', () => {
    it('should return 0 for empty history', () => {
      expect(service.getHistorySize()).toBe(0);
    });

    it('should return correct count after adding items', () => {
      service.addItem('Milk');
      expect(service.getHistorySize()).toBe(1);

      service.addItem('Cheese');
      expect(service.getHistorySize()).toBe(2);

      service.addItem('Bread');
      expect(service.getHistorySize()).toBe(3);
    });

    it('should not double-count deduplicated items', () => {
      service.addItem('Milk');
      service.addItem('Milk');
      service.addItem('milk');

      expect(service.getHistorySize()).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle whitespace in item names', () => {
      service.addItem('Milk Powder');

      const suggestions = service.getSuggestions('milk');
      expect(suggestions).toContain('Milk Powder');
    });

    it('should handle very long item names', () => {
      const longName = 'A'.repeat(1000);
      service.addItem(longName);

      const suggestions = service.getSuggestions('a');
      expect(suggestions).toContain(longName);
    });

    it('should handle special characters', () => {
      service.addItem('Café');
      service.addItem('Crème Brûlée');

      expect(service.getSuggestions('café')).toContain('Café');
      expect(service.getSuggestions('crème')).toContain('Crème Brûlée');
    });

    it('should handle numbers in item names', () => {
      service.addItem('Item 123');

      expect(service.getSuggestions('item')).toContain('Item 123');
    });

    it('should handle single character items', () => {
      service.addItem('A');

      expect(service.getSuggestions('a')).toContain('A');
    });
  });

  describe('localStorage Persistence', () => {
    it('should load history from localStorage on initialization', () => {
      service.addItem('Milk');

      // Reset singleton and create new instance
      (AutocompleteService as any).instance = undefined;
      const newService = AutocompleteService.getInstance();

      expect(newService.getHistorySize()).toBe(1);
      expect(newService.getSuggestions('milk')).toContain('Milk');
    });

    it('should handle corrupted localStorage data gracefully', () => {
      localStorageMock.setItem('shoppimo_autocomplete_history', 'corrupted json {]');

      // Reset singleton and create new instance
      (AutocompleteService as any).instance = undefined;
      const newService = AutocompleteService.getInstance();

      // Should start with empty history
      expect(newService.getHistorySize()).toBe(0);

      // Should work normally after
      newService.addItem('Milk');
      expect(newService.getHistorySize()).toBe(1);
    });

    it('should handle localStorage quota exceeded error', () => {
      localStorageMock.setItem.mockImplementationOnce(() => {
        const error = new DOMException('QuotaExceededError', 'QuotaExceededError');
        throw error;
      });

      // Should not throw
      expect(() => {
        service.addItem('Milk');
      }).not.toThrow();
    });

    it('should handle getItem errors gracefully', () => {
      localStorageMock.getItem.mockImplementationOnce(() => {
        throw new Error('localStorage error');
      });

      // Reset singleton and create new instance
      (AutocompleteService as any).instance = undefined;
      const newService = AutocompleteService.getInstance();

      // Should start with empty history
      expect(newService.getHistorySize()).toBe(0);
    });
  });
});
