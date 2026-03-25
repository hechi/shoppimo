import { RecentList, LocalCacheData } from '../types';

const CACHE_KEY = 'shopping-lists-cache';
const CACHE_VERSION = '1.0';
const MAX_ENTRIES = 10;

export class LocalCacheService {
  private static instance: LocalCacheService;
  private cache: RecentList[] = [];

  private constructor() {
    this.loadFromStorage();
  }

  static getInstance(): LocalCacheService {
    if (!LocalCacheService.instance) {
      LocalCacheService.instance = new LocalCacheService();
    }
    return LocalCacheService.instance;
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(CACHE_KEY);
      if (stored) {
        const data: LocalCacheData = JSON.parse(stored);
        // Handle version migration
        if (data.version !== CACHE_VERSION) {
          console.info(`Cache version mismatch. Expected ${CACHE_VERSION}, got ${data.version}. Clearing cache.`);
          this.clearCache();
          return;
        }
        
        // Validate structure and filter invalid entries
        if (Array.isArray(data.recentLists)) {
          this.cache = data.recentLists.filter(this.isValidRecentList);
          // If we filtered out invalid entries, save the cleaned cache
          if (this.cache.length !== data.recentLists.length) {
            this.saveToStorage();
          }
        } else {
          console.warn('Invalid cache structure, clearing cache');
          this.clearCache();
        }
      }
    } catch (error) {
      console.warn('Failed to load cache from localStorage:', error);
      this.clearCache();
    }
  }

  private saveToStorage(): void {
    try {
      const data: LocalCacheData = {
        recentLists: this.cache,
        version: CACHE_VERSION
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.warn('localStorage quota exceeded, clearing cache to free space');
        this.clearCache();
      } else {
        console.warn('Failed to save cache to localStorage:', error);
      }
    }
  }

  private isValidRecentList(item: any): item is RecentList {
    return (
      typeof item === 'object' &&
      typeof item.id === 'string' &&
      typeof item.title === 'string' &&
      typeof item.url === 'string' &&
      typeof item.lastAccessed === 'string' &&
      typeof item.itemCount === 'number'
    );
  }

  private generateTitle(itemCount: number): string {
    if (itemCount === 0) {
      return 'Empty List';
    }
    return `Shopping List (${itemCount} item${itemCount === 1 ? '' : 's'})`;
  }

  addRecentList(listId: string, url: string, itemCount: number = 0, customTitle?: string): void {
    const now = new Date().toISOString();
    const title = customTitle || this.generateTitle(itemCount);

    // Remove existing entry if it exists
    this.cache = this.cache.filter(item => item.id !== listId);

    // Add new entry at the beginning
    const newEntry: RecentList = {
      id: listId,
      title,
      url,
      lastAccessed: now,
      itemCount
    };

    this.cache.unshift(newEntry);

    // Apply LRU eviction - keep only MAX_ENTRIES
    if (this.cache.length > MAX_ENTRIES) {
      this.cache = this.cache.slice(0, MAX_ENTRIES);
    }

    this.saveToStorage();
  }

  getRecentLists(): RecentList[] {
    return [...this.cache]; // Return a copy to prevent external mutation
  }

  updateLastAccessed(listId: string): void {
    const index = this.cache.findIndex(item => item.id === listId);
    if (index !== -1) {
      const item = this.cache[index];
      item.lastAccessed = new Date().toISOString();
      
      // Move to front (most recently accessed)
      this.cache.splice(index, 1);
      this.cache.unshift(item);
      
      this.saveToStorage();
    }
  }

  removeInvalidList(listId: string): void {
    const initialLength = this.cache.length;
    this.cache = this.cache.filter(item => item.id !== listId);
    
    if (this.cache.length !== initialLength) {
      this.saveToStorage();
    }
  }

  clearCache(): void {
    this.cache = [];
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch (error) {
      console.warn('Failed to clear cache from localStorage:', error);
    }
  }

  updateItemCount(listId: string, itemCount: number): void {
    const item = this.cache.find(item => item.id === listId);
    if (item) {
      item.itemCount = itemCount;
      // Update title if it was auto-generated
      if (!item.title.includes('Shopping List')) {
        item.title = this.generateTitle(itemCount);
      }
      this.saveToStorage();
    }
  }

  validateCacheEntry(listId: string): Promise<boolean> {
    // This method can be used to validate if a cached list still exists on the server
    // For now, we'll implement a basic validation that can be extended
    return new Promise((resolve) => {
      const item = this.cache.find(item => item.id === listId);
      if (!item) {
        resolve(false);
        return;
      }
      
      // Basic validation - check if the entry is not too old (e.g., older than 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const lastAccessed = new Date(item.lastAccessed);
      
      if (lastAccessed < thirtyDaysAgo) {
        this.removeInvalidList(listId);
        resolve(false);
      } else {
        resolve(true);
      }
    });
  }

  isLocalStorageAvailable(): boolean {
    try {
      const test = '__localStorage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (error) {
      return false;
    }
  }

  getCacheStats(): { totalEntries: number; maxEntries: number; version: string } {
    return {
      totalEntries: this.cache.length,
      maxEntries: MAX_ENTRIES,
      version: CACHE_VERSION
    };
  }
}

export const localCacheService = LocalCacheService.getInstance();