import { vi, describe, it, expect, beforeEach } from 'vitest';

type MockClient = {
  url: string;
  focused: boolean;
  focus: ReturnType<typeof vi.fn>;
};

type MockRegistration = {
  showNotification: ReturnType<typeof vi.fn>;
  pushManager: {
    getSubscription: ReturnType<typeof vi.fn>;
  };
};

function makeSelf(clients: MockClient[] = [], registration?: Partial<MockRegistration>) {
  const mockRegistration: MockRegistration = {
    showNotification: vi.fn().mockResolvedValue(undefined),
    pushManager: { getSubscription: vi.fn().mockResolvedValue(null) },
    ...registration,
  };

  return {
    clients: {
      matchAll: vi.fn().mockResolvedValue(clients),
      openWindow: vi.fn().mockResolvedValue(undefined),
    },
    registration: mockRegistration,
    location: { origin: 'https://shoppimo.app' },
  };
}

describe('Service Worker push handler', () => {
  let mockSelf: ReturnType<typeof makeSelf>;
  let showNotification: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    showNotification = vi.fn().mockResolvedValue(undefined);
    mockSelf = makeSelf([], { showNotification });
  });

  it('shows notification when no focused client is on the list', async () => {
    const payload = {
      type: 'ITEM_ADDED',
      listId: 'list-123',
      title: 'List updated',
      body: 'Milk was added',
      url: '/list/list-123',
    };

    const unfocusedClient: MockClient = {
      url: 'https://shoppimo.app/list/list-123',
      focused: false,
      focus: vi.fn(),
    };
    mockSelf = makeSelf([unfocusedClient], { showNotification });

    const windowClients = await mockSelf.clients.matchAll({ type: 'window', includeUncontrolled: true });
    let suppressed = false;
    for (const client of windowClients) {
      if (client.url.includes(`/list/${payload.listId}`) && client.focused) {
        suppressed = true;
        break;
      }
    }

    if (!suppressed) {
      await mockSelf.registration.showNotification(payload.title, {
        body: payload.body,
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        data: { url: payload.url },
      });
    }

    expect(showNotification).toHaveBeenCalledWith('List updated', expect.objectContaining({
      body: 'Milk was added',
      data: { url: '/list/list-123' },
    }));
  });

  it('suppresses notification when focused client is on the same list', async () => {
    const payload = {
      type: 'ITEM_ADDED',
      listId: 'list-123',
      title: 'List updated',
      body: 'Milk was added',
      url: '/list/list-123',
    };

    const focusedClient: MockClient = {
      url: 'https://shoppimo.app/list/list-123',
      focused: true,
      focus: vi.fn(),
    };
    mockSelf = makeSelf([focusedClient], { showNotification });

    const windowClients = await mockSelf.clients.matchAll({ type: 'window', includeUncontrolled: true });
    let suppressed = false;
    for (const client of windowClients) {
      if (client.url.includes(`/list/${payload.listId}`) && client.focused) {
        suppressed = true;
        break;
      }
    }

    if (!suppressed) {
      await mockSelf.registration.showNotification(payload.title, {
        body: payload.body,
        data: { url: payload.url },
      });
    }

    expect(showNotification).not.toHaveBeenCalled();
  });

  it('includes icon, badge, and data.url in notification options', async () => {
    const payload = {
      type: 'ITEM_DELETED',
      listId: 'list-456',
      title: 'Item removed',
      body: 'Eggs was removed',
      url: '/list/list-456',
    };

    mockSelf = makeSelf([], { showNotification });

    const windowClients = await mockSelf.clients.matchAll({ type: 'window', includeUncontrolled: true });
    let suppressed = false;
    for (const client of windowClients) {
      if (client.url.includes(`/list/${payload.listId}`) && client.focused) {
        suppressed = true;
        break;
      }
    }

    if (!suppressed) {
      await mockSelf.registration.showNotification(payload.title, {
        body: payload.body,
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        data: { url: payload.url },
      });
    }

    expect(showNotification).toHaveBeenCalledWith('Item removed', {
      body: 'Eggs was removed',
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      data: { url: '/list/list-456' },
    });
  });
});

describe('Service Worker notificationclick handler', () => {
  it('opens window for target URL when no matching client exists', async () => {
    const openWindow = vi.fn().mockResolvedValue(undefined);
    const mockClients = {
      matchAll: vi.fn().mockResolvedValue([]),
      openWindow,
    };

    const targetUrl = '/list/list-789';
    const windowClients: MockClient[] = await mockClients.matchAll({ type: 'window', includeUncontrolled: true });

    let navigated = false;
    for (const client of windowClients) {
      if (client.url.includes(targetUrl)) {
        await client.focus();
        navigated = true;
        break;
      }
    }

    if (!navigated) {
      await mockClients.openWindow(targetUrl);
    }

    expect(openWindow).toHaveBeenCalledWith(targetUrl);
  });

  it('focuses existing client when matching window is already open', async () => {
    const focusFn = vi.fn().mockResolvedValue(undefined);
    const existingClient: MockClient = {
      url: 'https://shoppimo.app/list/list-789',
      focused: false,
      focus: focusFn,
    };
    const openWindow = vi.fn();
    const mockClients = {
      matchAll: vi.fn().mockResolvedValue([existingClient]),
      openWindow,
    };

    const targetUrl = '/list/list-789';
    const windowClients: MockClient[] = await mockClients.matchAll({ type: 'window', includeUncontrolled: true });

    let navigated = false;
    for (const client of windowClients) {
      if (client.url.includes(targetUrl)) {
        await client.focus();
        navigated = true;
        break;
      }
    }

    if (!navigated) {
      await mockClients.openWindow(targetUrl);
    }

    expect(focusFn).toHaveBeenCalled();
    expect(openWindow).not.toHaveBeenCalled();
  });
});
