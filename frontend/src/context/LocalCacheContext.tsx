import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { RecentList } from '../types';
import { localCacheService } from '../services/localCache';

interface LocalCacheContextType {
  recentLists: RecentList[];
  addRecentList: (listId: string, url: string, itemCount?: number, customTitle?: string) => void;
  updateLastAccessed: (listId: string) => void;
  removeInvalidList: (listId: string) => void;
  clearCache: () => void;
  updateItemCount: (listId: string, itemCount: number) => void;
  refreshCache: () => void;
  validateCacheEntry: (listId: string) => Promise<boolean>;
  isLocalStorageAvailable: () => boolean;
  getCacheStats: () => { totalEntries: number; maxEntries: number; version: string };
}

const LocalCacheContext = createContext<LocalCacheContextType | undefined>(undefined);

interface LocalCacheProviderProps {
  children: ReactNode;
}

export const LocalCacheProvider: React.FC<LocalCacheProviderProps> = ({ children }) => {
  const [recentLists, setRecentLists] = useState<RecentList[]>([]);

  const refreshCache = useCallback(() => {
    setRecentLists(localCacheService.getRecentLists());
  }, []);

  useEffect(() => {
    // Initialize cache on mount
    refreshCache();
  }, [refreshCache]);

  const addRecentList = useCallback((listId: string, url: string, itemCount: number = 0, customTitle?: string) => {
    localCacheService.addRecentList(listId, url, itemCount, customTitle);
    refreshCache();
  }, [refreshCache]);

  const updateLastAccessed = useCallback((listId: string) => {
    localCacheService.updateLastAccessed(listId);
    refreshCache();
  }, [refreshCache]);

  const removeInvalidList = useCallback((listId: string) => {
    localCacheService.removeInvalidList(listId);
    refreshCache();
  }, [refreshCache]);

  const clearCache = useCallback(() => {
    localCacheService.clearCache();
    refreshCache();
  }, [refreshCache]);

  const updateItemCount = useCallback((listId: string, itemCount: number) => {
    localCacheService.updateItemCount(listId, itemCount);
    refreshCache();
  }, [refreshCache]);

  const validateCacheEntry = useCallback((listId: string) => {
    return localCacheService.validateCacheEntry(listId);
  }, []);

  const isLocalStorageAvailable = useCallback(() => {
    return localCacheService.isLocalStorageAvailable();
  }, []);

  const getCacheStats = useCallback(() => {
    return localCacheService.getCacheStats();
  }, []);

  const value: LocalCacheContextType = {
    recentLists,
    addRecentList,
    updateLastAccessed,
    removeInvalidList,
    clearCache,
    updateItemCount,
    refreshCache,
    validateCacheEntry,
    isLocalStorageAvailable,
    getCacheStats
  };

  return (
    <LocalCacheContext.Provider value={value}>
      {children}
    </LocalCacheContext.Provider>
  );
};

export const useLocalCache = (): LocalCacheContextType => {
  const context = useContext(LocalCacheContext);
  if (context === undefined) {
    throw new Error('useLocalCache must be used within a LocalCacheProvider');
  }
  return context;
};