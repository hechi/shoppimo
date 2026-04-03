import { ShoppingList, ListItem, ApiError } from '../types';

// Get API URL from runtime config or build-time env var or fallback
const getApiUrl = () => {
  // Try runtime config first (allows post-build configuration)
  if (typeof window !== 'undefined' && (window as any).APP_CONFIG?.API_URL) {
    return (window as any).APP_CONFIG.API_URL;
  }
  // Fall back to build-time environment variable
  return (import.meta as any).env?.VITE_API_URL || 'http://localhost:8080';
};

const API_BASE_URL = `${getApiUrl()}/api`;

class ApiClient {
  private getDeviceId(): string | null {
    return localStorage.getItem('shoppimo_device_id');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        await response.text();
        const error: ApiError = {
          message: `HTTP ${response.status}: ${response.statusText}`,
          status: response.status,
        };
        throw error;
      }

      // Handle empty responses (like 204 No Content)
      if (response.status === 204 || response.headers.get('content-length') === '0') {
        return undefined as T;
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw {
          message: error.message,
          status: 0,
        } as ApiError;
      }
      throw error;
    }
  }

  async createList(): Promise<ShoppingList> {
    return this.request<ShoppingList>('/lists', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  async getList(listId: string): Promise<ShoppingList> {
    return this.request<ShoppingList>(`/lists/${listId}`);
  }

  private withDeviceId(endpoint: string): string {
    const deviceId = this.getDeviceId();
    if (deviceId) {
      const separator = endpoint.includes('?') ? '&' : '?';
      return `${endpoint}${separator}deviceId=${encodeURIComponent(deviceId)}`;
    }
    return endpoint;
  }

  async addItem(listId: string, text: string): Promise<ListItem> {
    return this.request<ListItem>(this.withDeviceId(`/lists/${listId}/items`), {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  }

  async updateItem(listId: string, itemId: string, text: string): Promise<ListItem> {
    return this.request<ListItem>(this.withDeviceId(`/lists/${listId}/items/${itemId}`), {
      method: 'PUT',
      body: JSON.stringify({ text }),
    });
  }

  async toggleItem(listId: string, itemId: string, completed: boolean): Promise<ListItem> {
    return this.request<ListItem>(this.withDeviceId(`/lists/${listId}/items/${itemId}`), {
      method: 'PUT',
      body: JSON.stringify({ completed }),
    });
  }

  async deleteItem(listId: string, itemId: string): Promise<void> {
    return this.request<void>(this.withDeviceId(`/lists/${listId}/items/${itemId}`), {
      method: 'DELETE',
    });
  }

  async updateAlias(listId: string, alias: string | null): Promise<ShoppingList> {
    return this.request<ShoppingList>(`/lists/${listId}/alias`, {
      method: 'PUT',
      body: JSON.stringify({ alias }),
    });
  }

  async getListByAlias(alias: string): Promise<ShoppingList> {
    return this.request<ShoppingList>(`/lists/by-alias/${encodeURIComponent(alias)}`);
  }

  async clearCompleted(listId: string): Promise<void> {
    return this.request<void>(this.withDeviceId(`/lists/${listId}/clear-completed`), {
      method: 'POST',
    });
  }
}

export const apiClient = new ApiClient();