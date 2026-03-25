import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import HomePage from '../HomePage';
import { describe, it, expect, vi } from 'vitest';

vi.mock('../../context/ListContext', () => ({
  useList: () => ({
    createList: vi.fn(),
    state: { loading: { isLoading: false, error: null } }
  })
}));

vi.mock('../../context/I18nContext', () => ({
  useI18n: () => ({
    t: (key: string) => key
  })
}));

vi.mock('../LanguageSwitcher', () => ({
  default: () => <div data-testid="language-switcher">LanguageSwitcher</div>
}));

vi.mock('../ThemeToggle', () => ({
  default: () => <div data-testid="theme-toggle">ThemeToggle</div>
}));

vi.mock('../RecentListsSection', () => ({
  default: () => <div data-testid="recent-lists">RecentLists</div>
}));

describe('HomePage', () => {
  it('has dark mode classes applied', () => {
    const { container } = render(
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    );
    
    expect(container.querySelector('.dark\\:bg-gray-900')).toBeTruthy();
    expect(container.querySelector('.dark\\:bg-gray-800')).toBeTruthy();
    expect(container.querySelector('.dark\\:text-gray-100')).toBeTruthy();
    expect(container.querySelector('.dark\\:text-gray-400')).toBeTruthy();
    expect(container.querySelector('.dark\\:bg-blue-500')).toBeTruthy();
  });
});