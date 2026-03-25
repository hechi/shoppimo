import React from 'react';
import { useI18n } from '../context/I18nContext';

interface SyncStatusIndicatorProps {
  connectionStatus: {
    isConnected: boolean;
    isReconnecting: boolean;
    reconnectAttempts: number;
    lastError?: string;
  };
  syncState: {
    isSyncing: boolean;
    pendingOperations: number;
    lastSyncTime?: Date;
  };
}

const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({
  connectionStatus,
  syncState,
}) => {
  const { t } = useI18n();
  const getStatusColor = () => {
    if (connectionStatus.isReconnecting) return 'yellow';
    if (!connectionStatus.isConnected) return 'red';
    if (syncState.isSyncing || syncState.pendingOperations > 0) return 'blue';
    return 'green';
  };

  const getStatusText = () => {
    if (connectionStatus.isReconnecting) {
      return `${t('sync.reconnecting')} (${connectionStatus.reconnectAttempts})`;
    }
    if (!connectionStatus.isConnected) {
      return t('sync.offline');
    }
    if (syncState.isSyncing) {
      return t('sync.syncing');
    }
    if (syncState.pendingOperations > 0) {
      return `${syncState.pendingOperations} pending`;
    }
    return t('sync.synced');
  };

  const getStatusIcon = () => {
    const color = getStatusColor();
    
    if (connectionStatus.isReconnecting || syncState.isSyncing) {
      return (
        <div className={`w-4 h-4 border-2 border-${color}-600 border-t-transparent rounded-full animate-spin`} />
      );
    }
    
    if (!connectionStatus.isConnected) {
      return (
        <svg className={`w-4 h-4 text-${color}-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-12.728 12.728m0-12.728l12.728 12.728" />
        </svg>
      );
    }
    
    return (
      <div className={`w-2 h-2 bg-${color}-500 rounded-full ${syncState.pendingOperations > 0 ? 'animate-pulse' : ''}`} />
    );
  };

  const color = getStatusColor();

  return (
    <div className="flex items-center gap-2" data-testid="sync-status">
      {getStatusIcon()}
      <span className={`px-2 py-1 bg-${color}-100 text-${color}-800 text-xs rounded-full font-medium`}>
        {getStatusText()}
      </span>
      
      {/* Detailed status tooltip */}
      <div className="relative group">
        <svg className="w-4 h-4 text-gray-400 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
          <div className="space-y-1">
            <div>Connection: {connectionStatus.isConnected ? t('sync.connected') : t('sync.disconnected')}</div>
            {syncState.lastSyncTime && (
              <div>Last sync: {syncState.lastSyncTime.toLocaleTimeString()}</div>
            )}
            {connectionStatus.lastError && (
              <div className="text-red-300">Error: {connectionStatus.lastError}</div>
            )}
          </div>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
        </div>
      </div>
    </div>
  );
};

export default SyncStatusIndicator;