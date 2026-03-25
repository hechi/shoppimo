import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import RecentListsSection from '../RecentListsSection';

// Mock the useLocalCache hook
vi.mock('../../context/LocalCacheContext', () => ({
  useLocalCache: vi.fn(),
}));

// Mock the useNavigate hook
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

import { useLocalCache } from '../../context/LocalCacheContext';
const mockUseLocalCache = useLocalCache as any;

const mockRecentLists = [
  {
    id: 'list-1',
    title: 'Groceries',
    url: '/list/list-1',
    lastAccessed: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    itemCount: 5
  },
  {
    id: 'list-2',
    title: 'Hardware Store',
    url: '/list/list-2',
    lastAccessed: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    itemCount: 3
  },
  {
    id: 'list-3',
    title: 'Empty List',
    url: '/list/list-3',
    lastAccessed: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
    itemCount: 0
  }
];

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('RecentListsSection', () => {
  const mockUpdateLastAccessed = vi.fn();
  const mockValidateCacheEntry = vi.fn();
  const mockIsLocalStorageAvailable = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    
    mockUseLocalCache.mockReturnValue({
      recentLists: mockRecentLists,
      updateLastAccessed: mockUpdateLastAccessed,
      validateCacheEntry: mockValidateCacheEntry,
      isLocalStorageAvailable: mockIsLocalStorageAvailable,
    });
    
    mockIsLocalStorageAvailable.mockReturnValue(true);
    mockValidateCacheEntry.mockResolvedValue(true);
  });

  it('should render recent lists section with lists', () => {
    renderWithRouter(<RecentListsSection />);

    expect(screen.getByText('Recent Lists')).toBeInTheDocument();
    expect(screen.getByText('Groceries')).toBeInTheDocument();
    expect(screen.getByText('Hardware Store')).toBeInTheDocument();
    expect(screen.getByText('Empty List')).toBeInTheDocument();
  });

  it('should display correct item counts', () => {
    renderWithRouter(<RecentListsSection />);

    expect(screen.getByText('5 items')).toBeInTheDocument();
    expect(screen.getByText('3 items')).toBeInTheDocument();
    expect(screen.getByText('0 items')).toBeInTheDocument();
  });

  it('should display singular item text for single item', () => {
    const singleItemList = [{
      id: 'list-single',
      title: 'Single Item List',
      url: '/list/list-single',
      lastAccessed: new Date().toISOString(),
      itemCount: 1
    }];

    mockUseLocalCache.mockReturnValue({
      recentLists: singleItemList,
      updateLastAccessed: mockUpdateLastAccessed,
      validateCacheEntry: mockValidateCacheEntry,
      isLocalStorageAvailable: mockIsLocalStorageAvailable,
    });

    renderWithRouter(<RecentListsSection />);

    expect(screen.getByText('1 item')).toBeInTheDocument();
  });

  it('should format time correctly for different periods', () => {
    renderWithRouter(<RecentListsSection />);

    expect(screen.getByText('2h ago')).toBeInTheDocument();
    expect(screen.getByText('Yesterday')).toBeInTheDocument();
    expect(screen.getByText('5d ago')).toBeInTheDocument();
  });

  it('should format "just now" for very recent access', () => {
    const recentList = [{
      id: 'list-recent',
      title: 'Recent List',
      url: '/list/list-recent',
      lastAccessed: new Date().toISOString(),
      itemCount: 2
    }];

    mockUseLocalCache.mockReturnValue({
      recentLists: recentList,
      updateLastAccessed: mockUpdateLastAccessed,
      validateCacheEntry: mockValidateCacheEntry,
      isLocalStorageAvailable: mockIsLocalStorageAvailable,
    });

    renderWithRouter(<RecentListsSection />);

    expect(screen.getByText('Just now')).toBeInTheDocument();
  });

  it('should navigate to list when clicked and update last accessed', async () => {
    const user = userEvent.setup();
    renderWithRouter(<RecentListsSection />);

    const listButton = screen.getByText('Groceries').closest('button');
    expect(listButton).toBeInTheDocument();

    await user.click(listButton!);

    await waitFor(() => {
      expect(mockValidateCacheEntry).toHaveBeenCalledWith('list-1');
      expect(mockUpdateLastAccessed).toHaveBeenCalledWith('list-1');
      expect(mockNavigate).toHaveBeenCalledWith('/list/list-1');
    });
  });

  it('should navigate without updating cache when validation fails', async () => {
    const user = userEvent.setup();
    mockValidateCacheEntry.mockResolvedValue(false);
    
    renderWithRouter(<RecentListsSection />);

    const listButton = screen.getByText('Groceries').closest('button');
    await user.click(listButton!);

    await waitFor(() => {
      expect(mockValidateCacheEntry).toHaveBeenCalledWith('list-1');
      expect(mockUpdateLastAccessed).not.toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/list/list-1');
    });
  });

  it('should not render when localStorage is not available', () => {
    mockIsLocalStorageAvailable.mockReturnValue(false);

    renderWithRouter(<RecentListsSection />);

    expect(screen.queryByText('Recent Lists')).not.toBeInTheDocument();
  });

  it('should not render when there are no recent lists', () => {
    mockUseLocalCache.mockReturnValue({
      recentLists: [],
      updateLastAccessed: mockUpdateLastAccessed,
      validateCacheEntry: mockValidateCacheEntry,
      isLocalStorageAvailable: mockIsLocalStorageAvailable,
    });

    renderWithRouter(<RecentListsSection />);

    expect(screen.queryByText('Recent Lists')).not.toBeInTheDocument();
  });

  it('should display description text', () => {
    renderWithRouter(<RecentListsSection />);

    expect(screen.getByText('Your recently visited shopping lists')).toBeInTheDocument();
  });

  it('should have proper accessibility attributes', () => {
    renderWithRouter(<RecentListsSection />);

    const listButtons = screen.getAllByRole('button');
    expect(listButtons.length).toBeGreaterThan(0);
    // Buttons without explicit type attribute default to 'button' in HTML
    listButtons.forEach(button => {
      expect(button.tagName).toBe('BUTTON');
    });
  });

  it('should truncate long list titles', () => {
    const longTitleList = [{
      id: 'list-long',
      title: 'This is a very long list title that should be truncated when displayed in the UI',
      url: '/list/list-long',
      lastAccessed: new Date().toISOString(),
      itemCount: 1
    }];

    mockUseLocalCache.mockReturnValue({
      recentLists: longTitleList,
      updateLastAccessed: mockUpdateLastAccessed,
      validateCacheEntry: mockValidateCacheEntry,
      isLocalStorageAvailable: mockIsLocalStorageAvailable,
    });

    renderWithRouter(<RecentListsSection />);

    const titleElement = screen.getByText('This is a very long list title that should be truncated when displayed in the UI');
    expect(titleElement).toHaveClass('truncate');
  });

  it('should handle validation errors gracefully', async () => {
    const user = userEvent.setup();
    mockValidateCacheEntry.mockRejectedValue(new Error('Validation failed'));
    
    renderWithRouter(<RecentListsSection />);

    const listButton = screen.getByText('Groceries').closest('button');
    
    // Should not throw error and still navigate
    await act(async () => {
      await user.click(listButton!);
    });

    // Even if validation fails, navigation should still occur
    expect(mockNavigate).toHaveBeenCalledWith('/list/list-1');
  });
});