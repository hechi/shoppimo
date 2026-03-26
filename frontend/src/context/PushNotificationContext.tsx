import React, { createContext, useContext, useState, ReactNode } from 'react';

type PermissionStatus = 'default' | 'granted' | 'denied';

interface PushNotificationContextType {
  permissionStatus: PermissionStatus;
  isSubscribed: boolean;
  isLoading: boolean;
  deviceId: string;
  requestPermission: () => Promise<void>;
  subscribe: (listId: string) => Promise<void>;
  unsubscribe: (listId: string) => Promise<void>;
}

const PushNotificationContext = createContext<PushNotificationContextType | undefined>(undefined);

const DEVICE_ID_KEY = 'shoppimo_device_id';

const getApiUrl = () => {
  // APP_CONFIG is injected at runtime by nginx/config.js for production deployments
  if (typeof window !== 'undefined' && (window as any).APP_CONFIG?.API_URL) {
    return (window as any).APP_CONFIG.API_URL;
  }
  // import.meta.env is a Vite-specific object not typed by default; cast required
  return (import.meta as any).env?.VITE_API_URL || 'http://localhost:8080';

};

const urlBase64ToUint8Array = (base64String: string): Uint8Array<ArrayBuffer> => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length) as Uint8Array<ArrayBuffer>;
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

const getOrCreateDeviceId = (): string => {
  const stored = localStorage.getItem(DEVICE_ID_KEY);
  if (stored) {
    return stored;
  }
  const newId = crypto.randomUUID();
  localStorage.setItem(DEVICE_ID_KEY, newId);
  return newId;
};

export const PushNotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission as PermissionStatus;
    }
    return 'default';
  });

  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [deviceId] = useState<string>(() => getOrCreateDeviceId());

  const requestPermission = async (): Promise<void> => {
    const result = await Notification.requestPermission();
    setPermissionStatus(result as PermissionStatus);
  };

  const subscribe = async (listId: string): Promise<void> => {
    setIsLoading(true);
    try {
      const apiBase = `${getApiUrl()}/api`;

      const vapidResponse = await fetch(`${apiBase}/push/vapid-key`, {
        headers: { 'Content-Type': 'application/json' },
      });
      const { publicKey } = await vapidResponse.json();

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const p256dhKey = subscription.getKey('p256dh');
      const authKey = subscription.getKey('auth');

      const p256dh = p256dhKey
        ? btoa(String.fromCharCode(...new Uint8Array(p256dhKey as ArrayBuffer)))
        : '';
      const auth = authKey
        ? btoa(String.fromCharCode(...new Uint8Array(authKey as ArrayBuffer)))
        : '';

      await fetch(`${apiBase}/push/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-Id': deviceId,
        },
        body: JSON.stringify({
          listId,
          endpoint: subscription.endpoint,
          p256dh,
          auth,
          deviceId,
        }),
      });

      setIsSubscribed(true);
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribe = async (listId: string): Promise<void> => {
    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        return;
      }

      await subscription.unsubscribe();

      const apiBase = `${getApiUrl()}/api`;
      await fetch(`${apiBase}/push/unsubscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-Id': deviceId,
        },
        body: JSON.stringify({
          listId,
          endpoint: subscription.endpoint,
        }),
      });

      setIsSubscribed(false);
    } finally {
      setIsLoading(false);
    }
  };

  const contextValue: PushNotificationContextType = {
    permissionStatus,
    isSubscribed,
    isLoading,
    deviceId,
    requestPermission,
    subscribe,
    unsubscribe,
  };

  return (
    <PushNotificationContext.Provider value={contextValue}>
      {children}
    </PushNotificationContext.Provider>
  );
};

export const useNotifications = (): PushNotificationContextType => {
  const context = useContext(PushNotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a PushNotificationProvider');
  }
  return context;
};
