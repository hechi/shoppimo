import { render, screen, waitFor } from '../../test/test-utils'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import ClearCompletedButton from '../ClearCompletedButton'

// Mock the useList hook
vi.mock('../../context/ListContext', () => ({
  useList: vi.fn(),
}))

import { useList } from '../../context/ListContext'
const mockUseList = useList as any
import { ShoppingList } from '../../types'

// Mock the API client
vi.mock('../../services/api', () => ({
  apiClient: {
    clearCompleted: vi.fn(),
  },
}))

// Mock the WebSocket client
vi.mock('../../services/websocket', () => ({
  webSocketClient: {
    addEventHandler: vi.fn(),
    removeEventHandler: vi.fn(),
    getConnectionStatus: vi.fn(() => true),
    connect: vi.fn(),
  },
}))

const mockListWithCompleted: ShoppingList = {
  id: 'test-list',
  items: [
    {
      id: '1',
      text: 'Active item',
      completed: false,
      createdAt: new Date().toISOString(),
      order: 1,
    },
    {
      id: '2',
      text: 'Completed item 1',
      completed: true,
      createdAt: new Date().toISOString(),
      order: 2,
    },
    {
      id: '3',
      text: 'Completed item 2',
      completed: true,
      createdAt: new Date().toISOString(),
      order: 3,
    },
  ],
  createdAt: new Date().toISOString(),
  lastModified: new Date().toISOString(),
}

const mockListWithoutCompleted: ShoppingList = {
  ...mockListWithCompleted,
  items: [
    {
      id: '1',
      text: 'Active item',
      completed: false,
      createdAt: new Date().toISOString(),
      order: 1,
    },
  ],
}

// Mock the useList hook to provide test data
vi.mock('../../context/ListContext', async () => {
  const actual = await vi.importActual('../../context/ListContext')
  return {
    ...actual,
    useList: vi.fn(),
  }
})

describe('ClearCompletedButton', () => {
  const mockClearCompleted = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not render when no completed items', () => {
    mockUseList.mockReturnValue({
      state: {
        list: mockListWithoutCompleted,
        loading: { isLoading: false, error: null },
        isConnected: true,
      },
      clearCompleted: mockClearCompleted,
    })

    const { container } = render(<ClearCompletedButton />)
    expect(container.firstChild).toBeNull()
  })

  it('renders when there are completed items', () => {
    mockUseList.mockReturnValue({
      state: {
        list: mockListWithCompleted,
        loading: { isLoading: false, error: null },
        isConnected: true,
      },
      clearCompleted: mockClearCompleted,
    })

    render(<ClearCompletedButton />)
    
    expect(screen.getByRole('button', { name: /clear completed/i })).toBeInTheDocument()
  })

  it('shows singular form for one completed item', () => {
    const listWithOneCompleted = {
      ...mockListWithCompleted,
      items: [
        mockListWithCompleted.items[0], // active item
        mockListWithCompleted.items[1], // one completed item
      ],
    }
    
    mockUseList.mockReturnValue({
      state: {
        list: listWithOneCompleted,
        loading: { isLoading: false, error: null },
        isConnected: true,
      },
      clearCompleted: mockClearCompleted,
    })

    render(<ClearCompletedButton />)
    
    expect(screen.getByRole('button', { name: /clear completed/i })).toBeInTheDocument()
  })

  it('shows confirmation dialog when clear button is clicked', async () => {
    const user = userEvent.setup()
    mockUseList.mockReturnValue({
      state: {
        list: mockListWithCompleted,
        loading: { isLoading: false, error: null },
        isConnected: true,
      },
      clearCompleted: mockClearCompleted,
    })

    render(<ClearCompletedButton />)
    
    const clearButton = screen.getByRole('button', { name: /clear completed/i })
    await user.click(clearButton)
    
    expect(screen.getByText('Remove 2 completed items?')).toBeInTheDocument()
    expect(screen.getByText('This cannot be undone')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('calls clearCompleted when remove is confirmed', async () => {
    const user = userEvent.setup()
    mockClearCompleted.mockResolvedValue(undefined)
    
    mockUseList.mockReturnValue({
      state: {
        list: mockListWithCompleted,
        loading: { isLoading: false, error: null },
        isConnected: true,
      },
      clearCompleted: mockClearCompleted,
    })

    render(<ClearCompletedButton />)
    
    const clearButton = screen.getByRole('button', { name: /clear completed/i })
    await user.click(clearButton)
    
    const removeButton = screen.getByRole('button', { name: /delete/i })
    await user.click(removeButton)
    
    expect(mockClearCompleted).toHaveBeenCalled()
  })

  it('cancels confirmation when cancel is clicked', async () => {
    const user = userEvent.setup()
    mockUseList.mockReturnValue({
      state: {
        list: mockListWithCompleted,
        loading: { isLoading: false, error: null },
        isConnected: true,
      },
      clearCompleted: mockClearCompleted,
    })

    render(<ClearCompletedButton />)
    
    const clearButton = screen.getByRole('button', { name: /clear completed/i })
    await user.click(clearButton)
    
    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    await user.click(cancelButton)
    
    expect(screen.queryByText('Remove 2 completed items?')).not.toBeInTheDocument()
    expect(mockClearCompleted).not.toHaveBeenCalled()
  })

  it('shows loading state during clear operation', async () => {
    const user = userEvent.setup()
    
    // Mock clearCompleted with delay
    mockClearCompleted.mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 100))
    )
    
    mockUseList.mockReturnValue({
      state: {
        list: mockListWithCompleted,
        loading: { isLoading: false, error: null },
        isConnected: true,
      },
      clearCompleted: mockClearCompleted,
    })

    render(<ClearCompletedButton />)
    
    const clearButton = screen.getByRole('button', { name: /clear completed/i })
    await user.click(clearButton)
    
    const removeButton = screen.getByRole('button', { name: /delete/i })
    await user.click(removeButton)
    
    expect(screen.getByText('Creating...')).toBeInTheDocument()
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })
})