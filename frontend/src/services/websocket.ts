import { WebSocketMessage, ShoppingList } from '../types';

export type WebSocketEventHandler = (message: WebSocketMessage) => void;
export type ConnectionStatusHandler = (status: ConnectionStatus) => void;
export type SyncStateHandler = (state: SyncState) => void;

export interface ConnectionStatus {
  isConnected: boolean;
  isReconnecting: boolean;
  reconnectAttempts: number;
  lastError?: string;
}

export interface SyncState {
  isSyncing: boolean;
  pendingOperations: number;
  lastSyncTime?: Date;
}

export interface PendingOperation {
  id: string;
  type: 'ADD_ITEM' | 'UPDATE_ITEM' | 'DELETE_ITEM' | 'TOGGLE_ITEM' | 'CLEAR_COMPLETED';
  payload: any;
  timestamp: Date;
  retryCount: number;
}

class WebSocketClient {
  private ws: WebSocket | null = null;
  private listId: string | null = null;
  private eventHandlers: WebSocketEventHandler[] = [];
  private connectionStatusHandlers: ConnectionStatusHandler[] = [];
  private syncStateHandlers: SyncStateHandler[] = [];
  
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000; // Start with 1 second
  private maxReconnectDelay = 30000; // Max 30 seconds
  private reconnectTimer: number | null = null;
  
  private isConnected = false;
  private isReconnecting = false;
  private lastError?: string;
  
  private pendingOperations: Map<string, PendingOperation> = new Map();
  private isSyncing = false;
  private lastSyncTime?: Date;
  
  private syncRequestCallback?: (listId: string) => Promise<ShoppingList>;
  
  // Track connection attempts to prevent rapid reconnections
  private connectionInProgress = false;
  private lastConnectionAttempt = 0;
  
  // Message deduplication
  private processedMessages = new Set<string>();
  private messageCleanupTimer: number | null = null;

  connect(listId: string, syncCallback?: (listId: string) => Promise<ShoppingList>): void {
    const now = Date.now();
    
    // Prevent rapid connection attempts (debounce)
    if (this.connectionInProgress || (now - this.lastConnectionAttempt < 100)) {
      return;
    }
    
    // If we're already connected to the same list, don't reconnect
    if (this.listId === listId && this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    this.lastConnectionAttempt = now;
    this.connectionInProgress = true;

    // If we have an existing connection, close it first
    if (this.ws && this.ws.readyState !== WebSocket.CLOSED) {
      this.ws.close(1000, 'Switching lists');
      this.ws = null;
    }

    // Clear reconnection timer if active
    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.listId = listId;
    this.syncRequestCallback = syncCallback;
    this.createConnection();
  }

  private createConnection(): void {
    if (!this.listId) return;

    this.isReconnecting = true;
    this.notifyConnectionStatus();

    try {
      // Get WebSocket URL from runtime config or build-time env var or fallback
      const getWsUrl = () => {
        // Try runtime config first (allows post-build configuration)
        if (typeof window !== 'undefined' && (window as any).APP_CONFIG?.WS_URL) {
          return (window as any).APP_CONFIG.WS_URL;
        }
        // Fall back to build-time environment variable
        return (import.meta as any).env?.VITE_WS_URL || 'ws://localhost:8080';
      };
      
      const wsUrl = `${getWsUrl()}/ws/${this.listId}`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.isReconnecting = false;
        this.connectionInProgress = false;
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        this.lastError = undefined;
        
        this.notifyConnectionStatus();
        this.replayPendingOperations();
        this.requestSync();
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          // Create a unique message ID for deduplication
          const messageId = `${message.type}-${message.listId}-${message.timestamp}-${JSON.stringify(message.data)}`;
          
          // Check if we've already processed this message
          if (this.processedMessages.has(messageId)) {
            return;
          }
          
          // Mark message as processed
          this.processedMessages.add(messageId);
          
          // Clean up old messages periodically (keep last 100 messages)
          if (this.processedMessages.size > 100) {
            const messagesToKeep = Array.from(this.processedMessages).slice(-50);
            this.processedMessages.clear();
            messagesToKeep.forEach(id => this.processedMessages.add(id));
          }
          
          this.handleMessage(message);
          this.eventHandlers.forEach(handler => handler(message));
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
          this.lastError = 'Failed to parse message';
          this.notifyConnectionStatus();
        }
      };

      this.ws.onclose = (event) => {
        this.isConnected = false;
        this.isReconnecting = false;
        this.connectionInProgress = false;
        
        if (event.code !== 1000) { // Not a normal closure
          this.lastError = `Connection closed: ${event.reason || 'Unknown reason'}`;
        }
        
        this.notifyConnectionStatus();
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.connectionInProgress = false;
        this.lastError = 'Connection error';
        this.notifyConnectionStatus();
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.isReconnecting = false;
      this.lastError = 'Failed to create connection';
      this.notifyConnectionStatus();
      this.attemptReconnect();
    }
  }

  private handleMessage(message: WebSocketMessage): void {
    // Remove corresponding pending operation if it exists
    const operationId = this.findMatchingOperation(message);
    if (operationId) {
      this.pendingOperations.delete(operationId);
      this.notifySyncState();
    }
    
    this.lastSyncTime = new Date();
    this.notifySyncState();
  }

  private findMatchingOperation(message: WebSocketMessage): string | null {
    for (const [id, operation] of this.pendingOperations) {
      if (this.operationMatchesMessage(operation, message)) {
        return id;
      }
    }
    return null;
  }

  private operationMatchesMessage(operation: PendingOperation, message: WebSocketMessage): boolean {
    switch (operation.type) {
      case 'ADD_ITEM':
        return message.type === 'ITEM_ADDED' && 
               message.data.text === operation.payload.text;
      case 'UPDATE_ITEM':
        return message.type === 'ITEM_UPDATED' && 
               message.data.id === operation.payload.itemId;
      case 'DELETE_ITEM':
        return message.type === 'ITEM_DELETED' && 
               message.data.id === operation.payload.itemId;
      case 'TOGGLE_ITEM':
        return message.type === 'ITEM_UPDATED' && 
               message.data.id === operation.payload.itemId &&
               message.data.completed === operation.payload.completed;
      case 'CLEAR_COMPLETED':
        return message.type === 'ITEMS_CLEARED';
      default:
        return false;
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.lastError = 'Max reconnection attempts reached';
      this.notifyConnectionStatus();
      return;
    }

    this.reconnectAttempts++;
    this.isReconnecting = true;
    this.notifyConnectionStatus();
    
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${this.reconnectDelay}ms...`);

    this.reconnectTimer = window.setTimeout(() => {
      this.createConnection();
    }, this.reconnectDelay);

    // Exponential backoff with jitter
    this.reconnectDelay = Math.min(
      this.reconnectDelay * 2 + Math.random() * 1000, 
      this.maxReconnectDelay
    );
  }

  private async requestSync(): Promise<void> {
    if (!this.syncRequestCallback) return;
    
    try {
      this.isSyncing = true;
      this.notifySyncState();
      
      await this.syncRequestCallback(this.listId!);
      
      this.lastSyncTime = new Date();
    } catch (error) {
      console.error('Failed to sync list state:', error);
    } finally {
      this.isSyncing = false;
      this.notifySyncState();
    }
  }

  async replayPendingOperations(): Promise<void> {
    if (this.pendingOperations.size === 0) return;
    
    console.log(`Replaying ${this.pendingOperations.size} pending operations...`);
    
    // Sort operations by timestamp
    const operations = Array.from(this.pendingOperations.values())
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    for (const operation of operations) {
      try {
        // Increment retry count
        operation.retryCount++;
        
        // Remove operations that have been retried too many times
        if (operation.retryCount > 3) {
          console.log(`Removing operation ${operation.id} after ${operation.retryCount} retries`);
          this.pendingOperations.delete(operation.id);
          continue;
        }
        
        // Emit the operation for retry
        this.eventHandlers.forEach(handler => {
          handler({
            type: 'REPLAY_OPERATION' as any,
            listId: this.listId!,
            data: operation,
            timestamp: new Date().toISOString()
          });
        });
      } catch (error) {
        console.error('Failed to replay operation:', operation, error);
        this.pendingOperations.delete(operation.id);
      }
    }
    
    this.notifySyncState();
  }
  
  // Public method to get pending operations for manual replay
  getPendingOperations(): PendingOperation[] {
    return Array.from(this.pendingOperations.values())
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  queueOperation(operation: Omit<PendingOperation, 'id' | 'timestamp' | 'retryCount'>): string {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const pendingOp: PendingOperation = {
      ...operation,
      id,
      timestamp: new Date(),
      retryCount: 0
    };
    
    this.pendingOperations.set(id, pendingOp);
    this.notifySyncState();
    
    return id;
  }

  removeOperation(operationId: string): void {
    this.pendingOperations.delete(operationId);
    this.notifySyncState();
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.messageCleanupTimer) {
      window.clearTimeout(this.messageCleanupTimer);
      this.messageCleanupTimer = null;
    }

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.isConnected = false;
    this.isReconnecting = false;
    this.connectionInProgress = false;
    this.listId = null;
    this.reconnectAttempts = 0;
    this.reconnectDelay = 1000;
    this.lastError = undefined;
    this.pendingOperations.clear();
    this.processedMessages.clear();
    this.isSyncing = false;
    this.lastSyncTime = undefined;
    this.syncRequestCallback = undefined;
    
    this.notifyConnectionStatus();
    this.notifySyncState();
  }

  addEventHandler(handler: WebSocketEventHandler): void {
    this.eventHandlers.push(handler);
  }

  removeEventHandler(handler: WebSocketEventHandler): void {
    const index = this.eventHandlers.indexOf(handler);
    if (index > -1) {
      this.eventHandlers.splice(index, 1);
    }
  }

  addConnectionStatusHandler(handler: ConnectionStatusHandler): void {
    this.connectionStatusHandlers.push(handler);
  }

  removeConnectionStatusHandler(handler: ConnectionStatusHandler): void {
    const index = this.connectionStatusHandlers.indexOf(handler);
    if (index > -1) {
      this.connectionStatusHandlers.splice(index, 1);
    }
  }

  addSyncStateHandler(handler: SyncStateHandler): void {
    this.syncStateHandlers.push(handler);
  }

  removeSyncStateHandler(handler: SyncStateHandler): void {
    const index = this.syncStateHandlers.indexOf(handler);
    if (index > -1) {
      this.syncStateHandlers.splice(index, 1);
    }
  }

  private notifyConnectionStatus(): void {
    const status: ConnectionStatus = {
      isConnected: this.isConnected,
      isReconnecting: this.isReconnecting,
      reconnectAttempts: this.reconnectAttempts,
      lastError: this.lastError
    };
    
    this.connectionStatusHandlers.forEach(handler => handler(status));
  }

  private notifySyncState(): void {
    const state: SyncState = {
      isSyncing: this.isSyncing,
      pendingOperations: this.pendingOperations.size,
      lastSyncTime: this.lastSyncTime
    };
    
    this.syncStateHandlers.forEach(handler => handler(state));
  }

  getConnectionStatus(): ConnectionStatus {
    return {
      isConnected: this.isConnected,
      isReconnecting: this.isReconnecting,
      reconnectAttempts: this.reconnectAttempts,
      lastError: this.lastError
    };
  }

  getSyncState(): SyncState {
    return {
      isSyncing: this.isSyncing,
      pendingOperations: this.pendingOperations.size,
      lastSyncTime: this.lastSyncTime
    };
  }
}

export const webSocketClient = new WebSocketClient();