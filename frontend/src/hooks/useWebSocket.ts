import { useEffect, useState, useRef, useCallback } from 'react';
import { 
  webSocketClient, 
  WebSocketEventHandler, 
  ConnectionStatus, 
  SyncState,
  ConnectionStatusHandler,
  SyncStateHandler
} from '../services/websocket';
import { ShoppingList } from '../types';

export const useWebSocket = (listId: string | null, syncCallback?: (listId: string) => Promise<ShoppingList>) => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    isConnected: false,
    isReconnecting: false,
    reconnectAttempts: 0
  });
  
  const [syncState, setSyncState] = useState<SyncState>({
    isSyncing: false,
    pendingOperations: 0
  });

  // Use ref to store the latest syncCallback without causing re-renders
  const syncCallbackRef = useRef(syncCallback);
  syncCallbackRef.current = syncCallback;

  useEffect(() => {
    if (!listId) return;

    // Connection status handler
    const handleConnectionStatus: ConnectionStatusHandler = (status) => {
      setConnectionStatus(status);
    };

    // Sync state handler
    const handleSyncState: SyncStateHandler = (state) => {
      setSyncState(state);
    };

    // Add handlers
    webSocketClient.addConnectionStatusHandler(handleConnectionStatus);
    webSocketClient.addSyncStateHandler(handleSyncState);

    // Connect to WebSocket with sync callback wrapped in a stable function
    const stableSyncCallback = syncCallbackRef.current 
      ? (listId: string) => syncCallbackRef.current!(listId)
      : undefined;
    
    webSocketClient.connect(listId, stableSyncCallback);

    // Get initial states
    setConnectionStatus(webSocketClient.getConnectionStatus());
    setSyncState(webSocketClient.getSyncState());

    return () => {
      webSocketClient.removeConnectionStatusHandler(handleConnectionStatus);
      webSocketClient.removeSyncStateHandler(handleSyncState);
      webSocketClient.disconnect();
    };
  }, [listId]); // Only depend on listId

  const addMessageHandler = useCallback((handler: WebSocketEventHandler) => {
    webSocketClient.addEventHandler(handler);
  }, []);

  const removeMessageHandler = useCallback((handler: WebSocketEventHandler) => {
    webSocketClient.removeEventHandler(handler);
  }, []);

  const queueOperation = useCallback((operation: {
    type: 'ADD_ITEM' | 'UPDATE_ITEM' | 'DELETE_ITEM' | 'TOGGLE_ITEM' | 'CLEAR_COMPLETED';
    payload: any;
  }) => {
    return webSocketClient.queueOperation(operation);
  }, []);

  const removeOperation = useCallback((operationId: string) => {
    webSocketClient.removeOperation(operationId);
  }, []);

  return {
    connectionStatus,
    syncState,
    isConnected: connectionStatus.isConnected,
    isReconnecting: connectionStatus.isReconnecting,
    isSyncing: syncState.isSyncing,
    hasPendingOperations: syncState.pendingOperations > 0,
    addMessageHandler,
    removeMessageHandler,
    queueOperation,
    removeOperation,
  };
};