import { useEffect, useRef } from 'react';
import { useNotifications } from '../context/PushNotificationContext';
import { useI18n } from '../context/I18nContext';

interface NotificationBellProps {
  listId: string;
}

const NotificationBell = ({ listId }: NotificationBellProps) => {
  const { permissionStatus, isSubscribed, isLoading, subscribe, unsubscribe, autoSubscribe, setOptedOut } = useNotifications();
  const { t } = useI18n();
  const autoSubscribeAttempted = useRef(false);

  useEffect(() => {
    if (autoSubscribeAttempted.current) return;
    autoSubscribeAttempted.current = true;
    autoSubscribe(listId);
  }, [listId, autoSubscribe]);

  const handleClick = async () => {
    if (permissionStatus === 'denied') {
      return;
    }

    if (isSubscribed) {
      setOptedOut(listId, true);
      await unsubscribe(listId);
    } else {
      setOptedOut(listId, false);
      if (permissionStatus !== 'granted') {
        const result = await Notification.requestPermission();
        if (result !== 'granted') return;
      }
      await subscribe(listId);
    }
  };

  const getTooltip = (): string => {
    if (permissionStatus === 'denied') {
      return t('notifications.blocked');
    }
    if (isSubscribed) {
      return t('notifications.disable');
    }
    return t('notifications.enable');
  };

  const getBellIcon = () => {
    if (isLoading) {
      return (
        <div className="animate-spin">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      );
    }

    if (permissionStatus === 'denied') {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          <line x1="4" y1="20" x2="20" y2="4" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
        </svg>
      );
    }

    if (isSubscribed) {
      return (
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M18 8a6 6 0 016 6v7a2 2 0 01-2 2H8a2 2 0 01-2-2v-7a6 6 0 016-6zM7 14a1 1 0 11-2 0 1 1 0 012 0zm8 0a1 1 0 11-2 0 1 1 0 012 0zm8 0a1 1 0 11-2 0 1 1 0 012 0z" />
        </svg>
      );
    }

    return (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    );
  };

  const isDisabled = isLoading || permissionStatus === 'denied';

  return (
    <button
      onClick={handleClick}
      disabled={isDisabled}
      title={getTooltip()}
      data-testid="push-subscribe-button"
      className={`px-3 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${
        isDisabled
          ? 'opacity-50 cursor-not-allowed bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
          : isSubscribed
            ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800 hover:bg-green-200 dark:hover:bg-green-800/50'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
      }`}
    >
      {getBellIcon()}
    </button>
  );
};

export default NotificationBell;
