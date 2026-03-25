import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '../../test/test-utils';
import { ThemeProvider, useTheme } from '../ThemeContext';

// Mock matchMedia
const mockMatchMedia = vi.fn();
window.matchMedia = mockMatchMedia as any;

// Test component to access the context
const TestComponent = () => {
  const { theme, setTheme, resolvedTheme } = useTheme();

  return (
    <div>
      <div data-testid="theme-value">{theme}</div>
      <div data-testid="resolved-theme-value">{resolvedTheme}</div>
      <button onClick={() => setTheme('light')}>Set Light</button>
      <button onClick={() => setTheme('dark')}>Set Dark</button>
      <button onClick={() => setTheme('system')}>Set System</button>
    </div>
  );
};

describe('ThemeContext', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    
    // Mock matchMedia
    mockMatchMedia.mockReturnValue({
      matches: false,
      media: '(prefers-color-scheme: dark)',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    });

    // Remove dark class from documentElement
    document.documentElement.classList.remove('dark');
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  it('should provide default theme as light', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    expect(screen.getByTestId('theme-value')).toHaveTextContent('light');
    expect(screen.getByTestId('resolved-theme-value')).toHaveTextContent('light');
  });

  it('should persist theme to localStorage on setTheme', async () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    const setDarkButton = screen.getByText('Set Dark');
    
    await act(async () => {
      setDarkButton.click();
    });

    expect(screen.getByTestId('theme-value')).toHaveTextContent('dark');
    expect(localStorage.getItem('shoppimo_theme')).toBe('dark');
  });

  it('should read theme from localStorage on mount', () => {
    localStorage.setItem('shoppimo_theme', 'dark');

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    expect(screen.getByTestId('theme-value')).toHaveTextContent('dark');
    expect(screen.getByTestId('resolved-theme-value')).toHaveTextContent('dark');
  });

  it('should add dark class to documentElement when theme is dark', async () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    const setDarkButton = screen.getByText('Set Dark');
    
    await act(async () => {
      setDarkButton.click();
    });

    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('should remove dark class from documentElement when theme is light', async () => {
    // First set dark
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    const setDarkButton = screen.getByText('Set Dark');
    await act(async () => {
      setDarkButton.click();
    });

    expect(document.documentElement.classList.contains('dark')).toBe(true);

    // Then set light
    const setLightButton = screen.getByText('Set Light');
    await act(async () => {
      setLightButton.click();
    });

    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('should use system preference when theme is system and prefers dark', async () => {
    mockMatchMedia.mockReturnValue({
      matches: true, // System prefers dark
      media: '(prefers-color-scheme: dark)',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    });

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    const setSystemButton = screen.getByText('Set System');
    
    await act(async () => {
      setSystemButton.click();
    });

    expect(screen.getByTestId('theme-value')).toHaveTextContent('system');
    expect(screen.getByTestId('resolved-theme-value')).toHaveTextContent('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('should use system preference when theme is system and prefers light', async () => {
    mockMatchMedia.mockReturnValue({
      matches: false, // System prefers light
      media: '(prefers-color-scheme: dark)',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    });

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    const setSystemButton = screen.getByText('Set System');
    
    await act(async () => {
      setSystemButton.click();
    });

    expect(screen.getByTestId('theme-value')).toHaveTextContent('system');
    expect(screen.getByTestId('resolved-theme-value')).toHaveTextContent('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('should throw error when useTheme is used outside ThemeProvider', () => {
    // Suppress console.error for this test
    const originalError = console.error;
    console.error = vi.fn();

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useTheme must be used within a ThemeProvider');

    console.error = originalError;
  });

  it('should update resolved theme when system preference changes', async () => {
    let changeCallback: ((e: any) => void) | null = null;

    mockMatchMedia.mockReturnValue({
      matches: false, // Initially light
      media: '(prefers-color-scheme: dark)',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn((event: string, callback: (e: any) => void) => {
        if (event === 'change') {
          changeCallback = callback;
        }
      }),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    });

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    const setSystemButton = screen.getByText('Set System');
    
    await act(async () => {
      setSystemButton.click();
    });

    expect(screen.getByTestId('resolved-theme-value')).toHaveTextContent('light');

    // Simulate system preference change
    if (changeCallback) {
      await act(async () => {
        changeCallback!({
          matches: true, // Now dark
          media: '(prefers-color-scheme: dark)',
        });
      });
    }

    expect(screen.getByTestId('resolved-theme-value')).toHaveTextContent('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});
