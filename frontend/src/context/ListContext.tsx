import React, { createContext, useContext, useReducer, useEffect, ReactNode, useCallback, useRef } from 'react';
import { ShoppingList, ListItem, LoadingState, WebSocketMessage } from '../types';
import { apiClient } from '../services/api';
import { useWebSocket } from '../hooks/useWebSocket';

interface ListState {
  list: ShoppingList | null;
  loading: LoadingState;
  optimisticOperations: Map<string, OptimisticOperation>;
  conflictNotification: {
    show: boolean;
    message: string;
  };
}

interface OptimisticOperation {
  id: string;
  type: 'ADD_ITEM' | 'UPDATE_ITEM' | 'DELETE_ITEM' | 'TOGGLE_ITEM' | 'CLEAR_COMPLETED';
  originalData?: any;
  timestamp: Date;
}

type ListAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_LIST'; payload: ShoppingList }
  | { type: 'ADD_ITEM'; payload: ListItem }
  | { type: 'UPDATE_ITEM'; payload: ListItem }
  | { type: 'DELETE_ITEM'; payload: string }
  | { type: 'CLEAR_COMPLETED' }
  | { type: 'ADD_OPTIMISTIC_OPERATION'; payload: OptimisticOperation }
  | { type: 'REMOVE_OPTIMISTIC_OPERATION'; payload: string }
  | { type: 'ROLLBACK_OPTIMISTIC_OPERATION'; payload: string }
  | { type: 'SHOW_CONFLICT_NOTIFICATION'; payload: string }
  | { type: 'HIDE_CONFLICT_NOTIFICATION' };

interface ListContextType {
  state: ListState;
  connectionStatus: any;
  syncState: any;
  loadList: (listId: string) => Promise<void>;
  createList: () => Promise<string>;
  addItem: (text: string) => Promise<void>;
  updateItem: (itemId: string, text: string) => Promise<void>;
  toggleItem: (itemId: string) => Promise<void>;
  deleteItem: (itemId: string) => Promise<void>;
  clearCompleted: () => Promise<void>;
  dismissConflictNotification: () => void;
}

const ListContext = createContext<ListContextType | undefined>(undefined);

const initialState: ListState = {
  list: null,
  loading: { isLoading: false, error: null },
  optimisticOperations: new Map(),
  conflictNotification: {
    show: false,
    message: '',
  },
};

function listReducer(state: ListState, action: ListAction): ListState {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        loading: { ...state.loading, isLoading: action.payload },
      };
    case 'SET_ERROR':
      return {
        ...state,
        loading: { ...state.loading, error: action.payload },
      };
    case 'SET_LIST':
      return {
        ...state,
        list: {
          ...action.payload,
          items: action.payload.items || []
        },
        loading: { isLoading: false, error: null },
      };
    case 'ADD_ITEM':
      if (!state.list) return state;
      return {
        ...state,
        list: {
          ...state.list,
          items: [...state.list.items, action.payload],
        },
      };
    case 'UPDATE_ITEM':
      if (!state.list) return state;
      return {
        ...state,
        list: {
          ...state.list,
          items: state.list.items.map(item =>
            item.id === action.payload.id ? action.payload : item
          ),
        },
      };
    case 'DELETE_ITEM':
      if (!state.list) return state;
      return {
        ...state,
        list: {
          ...state.list,
          items: state.list.items.filter(item => item.id !== action.payload),
        },
      };
    case 'CLEAR_COMPLETED':
      if (!state.list) return state;
      return {
        ...state,
        list: {
          ...state.list,
          items: state.list.items.filter(item => !item.completed),
        },
      };
    case 'ADD_OPTIMISTIC_OPERATION':
      const newOperations = new Map(state.optimisticOperations);
      newOperations.set(action.payload.id, action.payload);
      return {
        ...state,
        optimisticOperations: newOperations,
      };
    case 'REMOVE_OPTIMISTIC_OPERATION':
      const updatedOperations = new Map(state.optimisticOperations);
      updatedOperations.delete(action.payload);
      return {
        ...state,
        optimisticOperations: updatedOperations,
      };
    case 'ROLLBACK_OPTIMISTIC_OPERATION':
      const operation = state.optimisticOperations.get(action.payload);
      if (!operation || !state.list) return state;

      let rolledBackState = { ...state };

      // Rollback the operation based on its type
      switch (operation.type) {
        case 'ADD_ITEM':
          // Remove the optimistically added item
          rolledBackState.list = {
            ...state.list,
            items: state.list.items.filter(item => item.id !== operation.originalData?.id),
          };
          break;
        case 'UPDATE_ITEM':
        case 'TOGGLE_ITEM':
          // Restore the original item
          if (operation.originalData) {
            rolledBackState.list = {
              ...state.list,
              items: state.list.items.map(item =>
                item.id === operation.originalData.id ? operation.originalData : item
              ),
            };
          }
          break;
        case 'DELETE_ITEM':
          // Restore the deleted item
          if (operation.originalData) {
            rolledBackState.list = {
              ...state.list,
              items: [...state.list.items, operation.originalData],
            };
          }
          break;
        case 'CLEAR_COMPLETED':
          // Restore cleared items
          if (operation.originalData) {
            rolledBackState.list = {
              ...state.list,
              items: operation.originalData,
            };
          }
          break;
      }

      // Remove the operation
      const rollbackOperations = new Map(rolledBackState.optimisticOperations);
      rollbackOperations.delete(action.payload);
      rolledBackState.optimisticOperations = rollbackOperations;

      return rolledBackState;
    case 'SHOW_CONFLICT_NOTIFICATION':
      return {
        ...state,
        conflictNotification: {
          show: true,
          message: action.payload,
        },
      };
    case 'HIDE_CONFLICT_NOTIFICATION':
      return {
        ...state,
        conflictNotification: {
          show: false,
          message: '',
        },
      };
    default:
      return state;
  }
}

interface ListProviderProps {
  children: ReactNode;
}

export const ListProvider: React.FC<ListProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(listReducer, initialState);

  // Use ref to access current state in WebSocket handlers without causing re-renders
  const stateRef = useRef(state);
  stateRef.current = state;

  // Sync callback for WebSocket reconnection
  const syncCallback = useCallback(async (listId: string): Promise<ShoppingList> => {
    const freshList = await apiClient.getList(listId);
    dispatch({ type: 'SET_LIST', payload: freshList });
    return freshList;
  }, []); // dispatch is stable from useReducer

  const {
    connectionStatus,
    syncState,
    addMessageHandler,
    removeMessageHandler,
    queueOperation
  } = useWebSocket(state.list?.id || null, syncCallback);

  // Create stable WebSocket message handler using useCallback
  const handleWebSocketMessage = useCallback((message: WebSocketMessage) => {
    console.log('Received WebSocket message:', message.type, message);
    const currentState = stateRef.current;

    const findOptimisticOperation = (type: string, data: any): string | null => {
      console.log('Finding optimistic operation:', { type, data, operations: Array.from(currentState.optimisticOperations.entries()) });
      for (const [id, op] of currentState.optimisticOperations) {
        if (op.type === type) {
          switch (type) {
            case 'ADD_ITEM':
              console.log('Checking ADD_ITEM match:', { dataText: data.text, opText: op.originalData?.text });
              if (data.text === op.originalData?.text) return id;
              break;
            case 'UPDATE_ITEM':
            case 'TOGGLE_ITEM':
              if (data.id === op.originalData?.itemId) return id;
              break;
            case 'DELETE_ITEM':
              if (data.id === op.originalData?.itemId) return id;
              break;
            case 'CLEAR_COMPLETED':
              return id; // Only one clear operation at a time
          }
        }
      }
      return null;
    };

    switch (message.type) {
      case 'ITEM_ADDED':
        console.log('WebSocket ITEM_ADDED:', message.data);
        // Remove corresponding optimistic operation
        const addOpId = findOptimisticOperation('ADD_ITEM', message.data);
        console.log('Found optimistic add operation:', addOpId);
        if (addOpId) {
          console.log('Replacing temporary item with real item from WebSocket');
          // Find the optimistic operation to get the temporary item ID
          const addOperation = currentState.optimisticOperations.get(addOpId);
          if (addOperation?.originalData?.itemId) {
            // Replace temporary item with real item
            dispatch({ type: 'DELETE_ITEM', payload: addOperation.originalData.itemId });
            dispatch({ type: 'ADD_ITEM', payload: message.data });
          }
          dispatch({ type: 'REMOVE_OPTIMISTIC_OPERATION', payload: addOpId });
        } else {
          // This is from another client, check if item already exists before adding
          const itemExists = currentState.list?.items.some(item => item.id === message.data.id);
          if (!itemExists) {
            console.log('Adding item from WebSocket (another client):', message.data);
            dispatch({ type: 'ADD_ITEM', payload: message.data });
          } else {
            console.log('Item already exists, skipping WebSocket add:', message.data.id);
          }
        }
        break;
      case 'ITEM_UPDATED':
        // Remove corresponding optimistic operation
        const updateOpId = findOptimisticOperation('UPDATE_ITEM', message.data) ||
          findOptimisticOperation('TOGGLE_ITEM', message.data);
        console.log('WebSocket ITEM_UPDATED:', message.data);
        console.log('Found optimistic operation:', updateOpId);
        if (updateOpId) {
          console.log('Removing optimistic operation:', updateOpId);
          dispatch({ type: 'REMOVE_OPTIMISTIC_OPERATION', payload: updateOpId });
        } else {
          // This is from another client or our optimistic update failed, update the item
          console.log('Updating item from WebSocket:', message.data);
          dispatch({ type: 'UPDATE_ITEM', payload: message.data });
        }
        break;
      case 'ITEM_DELETED':
        console.log('WebSocket ITEM_DELETED:', message.data);
        // Remove corresponding optimistic operation
        const deleteOpId = findOptimisticOperation('DELETE_ITEM', { id: message.data.id });
        console.log('Found optimistic delete operation:', deleteOpId);
        if (deleteOpId) {
          console.log('Removing optimistic delete operation:', deleteOpId);
          dispatch({ type: 'REMOVE_OPTIMISTIC_OPERATION', payload: deleteOpId });
        } else {
          // This is from another client, delete the item
          console.log('Deleting item from WebSocket:', message.data.id);
          dispatch({ type: 'DELETE_ITEM', payload: message.data.id });
        }
        break;
      case 'ITEMS_CLEARED':
        // Remove corresponding optimistic operation
        const clearOpId = findOptimisticOperation('CLEAR_COMPLETED', {});
        if (clearOpId) {
          dispatch({ type: 'REMOVE_OPTIMISTIC_OPERATION', payload: clearOpId });
        } else {
          // This is from another client, clear completed items
          dispatch({ type: 'CLEAR_COMPLETED' });
        }
        break;
      case 'REPLAY_OPERATION':
        // Handle operation replay after reconnection - execute the actual API call
        console.log('Received REPLAY_OPERATION:', message.data);
        const operation = message.data as any;
        
        // Execute the operation based on its type
        (async () => {
          try {
            switch (operation.type) {
              case 'ADD_ITEM':
                console.log('Replaying ADD_ITEM:', operation.payload);
                await apiClient.addItem(currentState.list!.id, operation.payload.text);
                break;
              case 'UPDATE_ITEM':
                console.log('Replaying UPDATE_ITEM:', operation.payload);
                await apiClient.updateItem(currentState.list!.id, operation.payload.itemId, operation.payload.text);
                break;
              case 'TOGGLE_ITEM':
                console.log('Replaying TOGGLE_ITEM:', operation.payload);
                await apiClient.toggleItem(currentState.list!.id, operation.payload.itemId, operation.payload.completed);
                break;
              case 'DELETE_ITEM':
                console.log('Replaying DELETE_ITEM:', operation.payload);
                await apiClient.deleteItem(currentState.list!.id, operation.payload.itemId);
                break;
              case 'CLEAR_COMPLETED':
                console.log('Replaying CLEAR_COMPLETED');
                await apiClient.clearCompleted(currentState.list!.id);
                break;
            }
            console.log('Successfully replayed operation:', operation.type);
          } catch (error) {
            console.error('Failed to replay operation:', operation, error);
          }
        })();
        break;
    }
  }, []);



  useEffect(() => {
    addMessageHandler(handleWebSocketMessage);

    return () => {
      removeMessageHandler(handleWebSocketMessage);
    };
  }, [handleWebSocketMessage, addMessageHandler, removeMessageHandler]);

  const loadList = useCallback(async (listId: string): Promise<void> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const list = await apiClient.getList(listId);
      dispatch({ type: 'SET_LIST', payload: list });
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to load list' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const createList = useCallback(async (): Promise<string> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const list = await apiClient.createList();
      dispatch({ type: 'SET_LIST', payload: list });
      return list.id;
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to create list' });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const addItem = async (text: string): Promise<void> => {
    if (!state.list) return;

    // Create optimistic item
    const optimisticItem: ListItem = {
      id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text,
      completed: false,
      createdAt: new Date().toISOString(),
      order: state.list.items.length
    };

    // Create optimistic operation
    const operationId = `add-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const operation: OptimisticOperation = {
      id: operationId,
      type: 'ADD_ITEM',
      originalData: { text, itemId: optimisticItem.id },
      timestamp: new Date()
    };

    // Apply optimistic update
    dispatch({ type: 'ADD_ITEM', payload: optimisticItem });
    dispatch({ type: 'ADD_OPTIMISTIC_OPERATION', payload: operation });

    // Queue operation for offline support
    if (!connectionStatus.isConnected) {
      queueOperation({
        type: 'ADD_ITEM',
        payload: { text }
      });
      return;
    }

    try {
      const item = await apiClient.addItem(state.list.id, text);

      // Only update if the optimistic operation still exists (wasn't removed by WebSocket)
      if (state.optimisticOperations.has(operationId)) {
        console.log('API response: replacing temporary item', optimisticItem.id, 'with real item', item.id);
        // Check if the real item already exists (from WebSocket)
        const itemExists = state.list?.items.some(existingItem => existingItem.id === item.id);
        if (!itemExists) {
          dispatch({ type: 'DELETE_ITEM', payload: optimisticItem.id });
          dispatch({ type: 'ADD_ITEM', payload: item });
        } else {
          // Item already exists from WebSocket, just remove the temporary item
          console.log('Real item already exists from WebSocket, just removing temporary item');
          dispatch({ type: 'DELETE_ITEM', payload: optimisticItem.id });
        }
        dispatch({ type: 'REMOVE_OPTIMISTIC_OPERATION', payload: operationId });
      } else {
        console.log('API response: optimistic operation already removed by WebSocket');
      }
    } catch (error: any) {
      // Rollback optimistic update
      dispatch({ type: 'ROLLBACK_OPTIMISTIC_OPERATION', payload: operationId });
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to add item' });

      // Queue for retry if offline
      if (!connectionStatus.isConnected) {
        queueOperation({
          type: 'ADD_ITEM',
          payload: { text }
        });
      }
      throw error;
    }
  };

  const updateItem = async (itemId: string, text: string): Promise<void> => {
    if (!state.list) return;

    // Don't allow updating items with temporary IDs
    if (itemId.startsWith('temp-')) {
      console.log('Ignoring update for temporary item:', itemId);
      return;
    }

    const originalItem = state.list.items.find(i => i.id === itemId);
    if (!originalItem) return;

    // Create optimistic operation
    const operationId = `update-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const operation: OptimisticOperation = {
      id: operationId,
      type: 'UPDATE_ITEM',
      originalData: { ...originalItem, itemId }, // Store original state + itemId for matching
      timestamp: new Date()
    };

    // Apply optimistic update
    const optimisticItem = { ...originalItem, text };
    dispatch({ type: 'UPDATE_ITEM', payload: optimisticItem });
    dispatch({ type: 'ADD_OPTIMISTIC_OPERATION', payload: operation });

    // Queue operation for offline support
    if (!connectionStatus.isConnected) {
      queueOperation({
        type: 'UPDATE_ITEM',
        payload: { itemId, text }
      });
      return;
    }

    try {
      const item = await apiClient.updateItem(state.list.id, itemId, text);

      // Only update if the optimistic operation still exists (wasn't removed by WebSocket)
      if (state.optimisticOperations.has(operationId)) {
        dispatch({ type: 'UPDATE_ITEM', payload: item });
        dispatch({ type: 'REMOVE_OPTIMISTIC_OPERATION', payload: operationId });
      }
    } catch (error: any) {
      // Rollback optimistic update
      dispatch({ type: 'ROLLBACK_OPTIMISTIC_OPERATION', payload: operationId });
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to update item' });

      // Queue for retry if offline
      if (!connectionStatus.isConnected) {
        queueOperation({
          type: 'UPDATE_ITEM',
          payload: { itemId, text }
        });
      }
      throw error;
    }
  };

  const toggleItem = async (itemId: string): Promise<void> => {
    console.log('toggleItem called:', itemId);
    if (!state.list) return;

    // Don't allow toggling items with temporary IDs
    if (itemId.startsWith('temp-')) {
      console.log('Ignoring toggle for temporary item:', itemId);
      return;
    }

    const originalItem = state.list.items.find(i => i.id === itemId);
    if (!originalItem) return;

    const newCompleted = !originalItem.completed;
    console.log('Toggling item:', { itemId, originalCompleted: originalItem.completed, newCompleted });

    // Create optimistic operation
    const operationId = `toggle-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const operation: OptimisticOperation = {
      id: operationId,
      type: 'TOGGLE_ITEM',
      originalData: { ...originalItem, itemId }, // Store the original state + itemId for matching
      timestamp: new Date()
    };

    // Apply optimistic update
    const optimisticItem = { ...originalItem, completed: newCompleted };
    dispatch({ type: 'UPDATE_ITEM', payload: optimisticItem });
    dispatch({ type: 'ADD_OPTIMISTIC_OPERATION', payload: operation });

    // Queue operation for offline support
    if (!connectionStatus.isConnected) {
      queueOperation({
        type: 'TOGGLE_ITEM',
        payload: { itemId, completed: newCompleted }
      });
      return;
    }

    try {
      const item = await apiClient.toggleItem(state.list.id, itemId, newCompleted);

      // Only update if the optimistic operation still exists (wasn't removed by WebSocket)
      if (state.optimisticOperations.has(operationId)) {
        dispatch({ type: 'UPDATE_ITEM', payload: item });
        dispatch({ type: 'REMOVE_OPTIMISTIC_OPERATION', payload: operationId });
      }
    } catch (error: any) {
      // Rollback optimistic update
      dispatch({ type: 'ROLLBACK_OPTIMISTIC_OPERATION', payload: operationId });
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to toggle item' });

      // Queue for retry if offline
      if (!connectionStatus.isConnected) {
        queueOperation({
          type: 'TOGGLE_ITEM',
          payload: { itemId, completed: newCompleted }
        });
      }
      throw error;
    }
  };

  const deleteItem = async (itemId: string): Promise<void> => {
    if (!state.list) return;

    // Don't allow deleting items with temporary IDs
    if (itemId.startsWith('temp-')) {
      console.log('Ignoring delete for temporary item:', itemId);
      return;
    }

    const originalItem = state.list.items.find(i => i.id === itemId);
    if (!originalItem) return;

    // Create optimistic operation
    const operationId = `delete-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const operation: OptimisticOperation = {
      id: operationId,
      type: 'DELETE_ITEM',
      originalData: { ...originalItem, itemId },
      timestamp: new Date()
    };

    // Apply optimistic update
    dispatch({ type: 'DELETE_ITEM', payload: itemId });
    dispatch({ type: 'ADD_OPTIMISTIC_OPERATION', payload: operation });

    // Queue operation for offline support
    if (!connectionStatus.isConnected) {
      queueOperation({
        type: 'DELETE_ITEM',
        payload: { itemId }
      });
      return;
    }

    try {
      await apiClient.deleteItem(state.list.id, itemId);

      // Confirm deletion
      dispatch({ type: 'REMOVE_OPTIMISTIC_OPERATION', payload: operationId });
    } catch (error: any) {
      // Rollback optimistic update
      dispatch({ type: 'ROLLBACK_OPTIMISTIC_OPERATION', payload: operationId });
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to delete item' });

      // Queue for retry if offline
      if (!connectionStatus.isConnected) {
        queueOperation({
          type: 'DELETE_ITEM',
          payload: { itemId }
        });
      }
      throw error;
    }
  };

  const clearCompleted = async (): Promise<void> => {
    if (!state.list) return;

    const completedItems = state.list.items.filter(item => item.completed);
    if (completedItems.length === 0) return;

    // Create optimistic operation
    const operationId = `clear-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const operation: OptimisticOperation = {
      id: operationId,
      type: 'CLEAR_COMPLETED',
      originalData: [...state.list.items], // Store all items for rollback
      timestamp: new Date()
    };

    // Apply optimistic update
    dispatch({ type: 'CLEAR_COMPLETED' });
    dispatch({ type: 'ADD_OPTIMISTIC_OPERATION', payload: operation });

    // Queue operation for offline support
    if (!connectionStatus.isConnected) {
      queueOperation({
        type: 'CLEAR_COMPLETED',
        payload: {}
      });
      return;
    }

    try {
      await apiClient.clearCompleted(state.list.id);

      // Confirm clear
      dispatch({ type: 'REMOVE_OPTIMISTIC_OPERATION', payload: operationId });
    } catch (error: any) {
      // Rollback optimistic update
      dispatch({ type: 'ROLLBACK_OPTIMISTIC_OPERATION', payload: operationId });
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to clear completed items' });

      // Queue for retry if offline
      if (!connectionStatus.isConnected) {
        queueOperation({
          type: 'CLEAR_COMPLETED',
          payload: {}
        });
      }
    }
  };

  const dismissConflictNotification = () => {
    dispatch({ type: 'HIDE_CONFLICT_NOTIFICATION' });
  };

  const value: ListContextType = {
    state,
    connectionStatus,
    syncState,
    loadList,
    createList,
    addItem,
    updateItem,
    toggleItem,
    deleteItem,
    clearCompleted,
    dismissConflictNotification,
  };

  return <ListContext.Provider value={value}>{children}</ListContext.Provider>;
};

export const useList = (): ListContextType => {
  const context = useContext(ListContext);
  if (context === undefined) {
    throw new Error('useList must be used within a ListProvider');
  }
  return context;
};