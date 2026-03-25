// TypeScript interfaces for ShoppingList and ListItem models

export interface ListItem {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
  order: number;
}

export interface ShoppingList {
  id: string;
  items: ListItem[];
  createdAt: string;
  lastModified: string;
  expiresAt?: string;
}

export interface WebSocketMessage {
  type: 'ITEM_ADDED' | 'ITEM_UPDATED' | 'ITEM_DELETED' | 'ITEMS_CLEARED' | 'REPLAY_OPERATION';
  listId: string;
  data: any;
  timestamp: string;
}

export interface ApiError {
  message: string;
  status: number;
}

export interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

export interface RecentList {
  id: string;
  title: string;
  url: string;
  lastAccessed: string;
  itemCount: number;
}

export interface LocalCacheData {
  recentLists: RecentList[];
  version: string;
}