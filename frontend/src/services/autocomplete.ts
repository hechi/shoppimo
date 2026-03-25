const STORAGE_KEY = 'shoppimo_autocomplete_history';
const MAX_HISTORY_SIZE = 500;

export interface AutocompleteEntry {
  text: string;
  normalizedText: string;
  lastUsed: number;
}

export class AutocompleteService {
  private static instance: AutocompleteService;
  private history: AutocompleteEntry[] = [];

  private constructor() {
    this.loadFromStorage();
  }

  static getInstance(): AutocompleteService {
    if (!AutocompleteService.instance) {
      AutocompleteService.instance = new AutocompleteService();
    }
    return AutocompleteService.instance;
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data: AutocompleteEntry[] = JSON.parse(stored);
        if (Array.isArray(data)) {
          this.history = data.filter(this.isValidEntry);
        } else {
          this.history = [];
        }
      }
    } catch (error) {
      console.warn('Failed to load autocomplete history from localStorage:', error);
      this.history = [];
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.history));
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.warn('localStorage quota exceeded for autocomplete history');
      } else {
        console.warn('Failed to save autocomplete history to localStorage:', error);
      }
    }
  }

  private isValidEntry(item: any): item is AutocompleteEntry {
    return (
      typeof item === 'object' &&
      typeof item.text === 'string' &&
      typeof item.normalizedText === 'string' &&
      typeof item.lastUsed === 'number'
    );
  }

  addItem(text: string): void {
    const normalizedText = text.toLowerCase();
    const now = Date.now();

    const existingIndex = this.history.findIndex(
      entry => entry.normalizedText === normalizedText
    );

    if (existingIndex !== -1) {
      this.history[existingIndex].text = text;
      this.history[existingIndex].lastUsed = now;
      const [entry] = this.history.splice(existingIndex, 1);
      this.history.unshift(entry);
    } else {
      this.history.unshift({
        text,
        normalizedText,
        lastUsed: now,
      });
    }

    if (this.history.length > MAX_HISTORY_SIZE) {
      this.history = this.history.slice(0, MAX_HISTORY_SIZE);
    }

    this.saveToStorage();
  }

  getSuggestions(prefix: string, limit: number = 8): string[] {
    if (!prefix) {
      return [];
    }

    const normalizedPrefix = prefix.toLowerCase();

    return this.history
      .filter(entry => entry.normalizedText.startsWith(normalizedPrefix))
      .sort((a, b) => b.lastUsed - a.lastUsed)
      .slice(0, limit)
      .map(entry => entry.text);
  }

  clearHistory(): void {
    this.history = [];
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear autocomplete history from localStorage:', error);
    }
  }

  getHistorySize(): number {
    return this.history.length;
  }
}

export const autocompleteService = AutocompleteService.getInstance();
