import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, act, waitFor } from '../../test/test-utils';
import {
  PushNotificationProvider,
  useNotifications,
} from '../PushNotificationContext';

const mockRequestPermission = vi.fn();
const mockSubscribe = vi.fn();
const mockGetSubscription = vi.fn();
const mockUnsubscribe = vi.fn();

const mockPushManager = {
  subscribe: mockSubscribe,
  getSubscription: mockGetSubscription,
};

const mockServiceWorkerRegistration = {
  pushManager: mockPushManager,
};

Object.defineProperty(window, 'Notification', {
  writable: true,
  value: {
    permission: 'default' as NotificationPermission,
    requestPermission: mockRequestPermission,
  },
});

Object.defineProperty(navigator, 'serviceWorker', {
  writable: true,
  value: {
    ready: Promise.resolve(mockServiceWorkerRegistration),
  },
});

const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockRandomUUID = vi.fn(() => 'test-uuid-1234-5678-abcd');
Object.defineProperty(globalThis.crypto, 'randomUUID', {
  writable: true,
  value: mockRandomUUID,
});

const TestComponent = () => {
  const {
    permissionStatus,
    isSubscribed,
    isLoading,
    deviceId,
    requestPermission,
    subscribe,
    unsubscribe,
  } = useNotifications();

  return (
    <div>
      <div data-testid="permission-status">{permissionStatus}</div>
      <div data-testid="is-subscribed">{String(isSubscribed)}</div>
      <div data-testid="is-loading">{String(isLoading)}</div>
      <div data-testid="device-id">{deviceId}</div>
      <button onClick={requestPermission}>Request Permission</button>
      <button onClick={() => subscribe('list-123')}>Subscribe</button>
      <button onClick={() => unsubscribe('list-123')}>Unsubscribe</button>
    </div>
  );
};

describe('PushNotificationContext', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();

    (window.Notification as any).permission = 'default';

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ publicKey: 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U' }),
      headers: { get: () => null },
      text: async () => '',
    });

    Object.defineProperty(navigator, 'serviceWorker', {
      writable: true,
      value: {
        ready: Promise.resolve(mockServiceWorkerRegistration),
      },
    });

    mockSubscribe.mockResolvedValue({
      endpoint: 'https://push.example.com/sub/test',
      getKey: (name: string) => {
        if (name === 'p256dh') return new Uint8Array([1, 2, 3]);
        if (name === 'auth') return new Uint8Array([4, 5, 6]);
        return null;
      },
    });
    mockGetSubscription.mockResolvedValue({
      endpoint: 'https://push.example.com/sub/test',
      unsubscribe: mockUnsubscribe,
    });
    mockUnsubscribe.mockResolvedValue(true);
    mockRequestPermission.mockResolvedValue('granted');
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should provide default permissionStatus as current Notification.permission', () => {
    (window.Notification as any).permission = 'default';

    render(
      <PushNotificationProvider>
        <TestComponent />
      </PushNotificationProvider>
    );

    expect(screen.getByTestId('permission-status')).toHaveTextContent('default');
  });

  it('should provide permissionStatus as granted when Notification.permission is granted', () => {
    (window.Notification as any).permission = 'granted';

    render(
      <PushNotificationProvider>
        <TestComponent />
      </PushNotificationProvider>
    );

    expect(screen.getByTestId('permission-status')).toHaveTextContent('granted');
  });

  it('should provide default isSubscribed as false', () => {
    render(
      <PushNotificationProvider>
        <TestComponent />
      </PushNotificationProvider>
    );

    expect(screen.getByTestId('is-subscribed')).toHaveTextContent('false');
  });

  it('should provide default isLoading as false', () => {
    render(
      <PushNotificationProvider>
        <TestComponent />
      </PushNotificationProvider>
    );

    expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
  });

  it('should NOT auto-request permission on mount', () => {
    render(
      <PushNotificationProvider>
        <TestComponent />
      </PushNotificationProvider>
    );

    expect(mockRequestPermission).not.toHaveBeenCalled();
  });

  it('should generate a UUID device ID on first visit and persist it', () => {
    expect(localStorage.getItem('shoppimo_device_id')).toBeNull();

    render(
      <PushNotificationProvider>
        <TestComponent />
      </PushNotificationProvider>
    );

    expect(screen.getByTestId('device-id')).toHaveTextContent('test-uuid-1234-5678-abcd');
    expect(localStorage.getItem('shoppimo_device_id')).toBe('test-uuid-1234-5678-abcd');
    expect(mockRandomUUID).toHaveBeenCalled();
  });

  it('should read existing device ID from localStorage on mount (no new UUID)', () => {
    localStorage.setItem('shoppimo_device_id', 'existing-device-uuid');
    mockRandomUUID.mockClear();

    render(
      <PushNotificationProvider>
        <TestComponent />
      </PushNotificationProvider>
    );

    expect(screen.getByTestId('device-id')).toHaveTextContent('existing-device-uuid');
    expect(mockRandomUUID).not.toHaveBeenCalled();
  });

  it('should update permissionStatus to granted after requestPermission resolves granted', async () => {
    mockRequestPermission.mockResolvedValue('granted');

    render(
      <PushNotificationProvider>
        <TestComponent />
      </PushNotificationProvider>
    );

    expect(screen.getByTestId('permission-status')).toHaveTextContent('default');

    await act(async () => {
      screen.getByText('Request Permission').click();
    });

    expect(mockRequestPermission).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('permission-status')).toHaveTextContent('granted');
  });

  it('should update permissionStatus to denied after requestPermission resolves denied', async () => {
    mockRequestPermission.mockResolvedValue('denied');

    render(
      <PushNotificationProvider>
        <TestComponent />
      </PushNotificationProvider>
    );

    await act(async () => {
      screen.getByText('Request Permission').click();
    });

    expect(screen.getByTestId('permission-status')).toHaveTextContent('denied');
  });

  it('should call GET /api/push/vapid-key when subscribe is called', async () => {
    render(
      <PushNotificationProvider>
        <TestComponent />
      </PushNotificationProvider>
    );

    await act(async () => {
      screen.getByText('Subscribe').click();
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/push/vapid-key'),
      expect.any(Object)
    );
  });

  it('should call pushManager.subscribe with userVisibleOnly: true', async () => {
    render(
      <PushNotificationProvider>
        <TestComponent />
      </PushNotificationProvider>
    );

    await act(async () => {
      screen.getByText('Subscribe').click();
    });

    expect(mockSubscribe).toHaveBeenCalledWith(
      expect.objectContaining({ userVisibleOnly: true })
    );
  });

  it('should call POST /api/push/subscribe with body and X-Device-Id header', async () => {
    localStorage.setItem('shoppimo_device_id', 'my-device-uuid');

    render(
      <PushNotificationProvider>
        <TestComponent />
      </PushNotificationProvider>
    );

    await act(async () => {
      screen.getByText('Subscribe').click();
    });

    const subscribeCall = mockFetch.mock.calls.find((call: any[]) =>
      (call[0] as string).includes('/api/push/subscribe')
    );
    expect(subscribeCall).toBeDefined();

    const [, options] = subscribeCall as [string, RequestInit];
    expect(options.method).toBe('POST');

    const headers = options.headers as Record<string, string>;
    expect(headers['X-Device-Id']).toBe('my-device-uuid');

    const body = JSON.parse(options.body as string);
    expect(body.listId).toBe('list-123');
    expect(body.endpoint).toBe('https://push.example.com/sub/test');
    expect(body.deviceId).toBe('my-device-uuid');
  });

  it('should set isSubscribed to true after successful subscribe', async () => {
    render(
      <PushNotificationProvider>
        <TestComponent />
      </PushNotificationProvider>
    );

    await act(async () => {
      screen.getByText('Subscribe').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('is-subscribed')).toHaveTextContent('true');
    });
  });

  it('should set isLoading to true during subscribe and false after completion', async () => {
    let resolveSubscribe!: (value: any) => void;
    mockSubscribe.mockReturnValue(
      new Promise((res) => {
        resolveSubscribe = res;
      })
    );

    render(
      <PushNotificationProvider>
        <TestComponent />
      </PushNotificationProvider>
    );

    act(() => {
      screen.getByText('Subscribe').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('is-loading')).toHaveTextContent('true');
    });

    await act(async () => {
      resolveSubscribe({
        endpoint: 'https://push.example.com/sub/test',
        getKey: (name: string) => {
          if (name === 'p256dh') return new Uint8Array([1, 2, 3]);
          if (name === 'auth') return new Uint8Array([4, 5, 6]);
          return null;
        },
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
    });
  });

  it('should call subscription.unsubscribe() when unsubscribe is called', async () => {
    render(
      <PushNotificationProvider>
        <TestComponent />
      </PushNotificationProvider>
    );

    await act(async () => {
      screen.getByText('Unsubscribe').click();
    });

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it('should call POST /api/push/unsubscribe with body and X-Device-Id header', async () => {
    localStorage.setItem('shoppimo_device_id', 'my-device-uuid');

    render(
      <PushNotificationProvider>
        <TestComponent />
      </PushNotificationProvider>
    );

    await act(async () => {
      screen.getByText('Unsubscribe').click();
    });

    const unsubscribeCall = mockFetch.mock.calls.find((call: any[]) =>
      (call[0] as string).includes('/api/push/unsubscribe')
    );
    expect(unsubscribeCall).toBeDefined();

    const [, options] = unsubscribeCall as [string, RequestInit];
    expect(options.method).toBe('POST');

    const headers = options.headers as Record<string, string>;
    expect(headers['X-Device-Id']).toBe('my-device-uuid');

    const body = JSON.parse(options.body as string);
    expect(body.listId).toBe('list-123');
    expect(body.endpoint).toBe('https://push.example.com/sub/test');
  });

  it('should set isSubscribed to false after successful unsubscribe when previously subscribed', async () => {
    render(
      <PushNotificationProvider>
        <TestComponent />
      </PushNotificationProvider>
    );

    await act(async () => {
      screen.getByText('Subscribe').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('is-subscribed')).toHaveTextContent('true');
    });

    await act(async () => {
      screen.getByText('Unsubscribe').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('is-subscribed')).toHaveTextContent('false');
    });
  });

  it('should skip unsubscribe API call if no subscription exists', async () => {
    mockGetSubscription.mockResolvedValue(null);

    render(
      <PushNotificationProvider>
        <TestComponent />
      </PushNotificationProvider>
    );

    await act(async () => {
      screen.getByText('Unsubscribe').click();
    });

    const unsubscribeCall = mockFetch.mock.calls.find((call: any[]) =>
      (call[0] as string).includes('/api/push/unsubscribe')
    );
    expect(unsubscribeCall).toBeUndefined();
    expect(mockUnsubscribe).not.toHaveBeenCalled();
  });

  it('should throw error when useNotifications is used outside PushNotificationProvider', () => {
    const originalError = console.error;
    console.error = vi.fn();

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useNotifications must be used within a PushNotificationProvider');

    console.error = originalError;
  });
});
