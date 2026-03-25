import { render, screen, waitFor } from '../../test/test-utils'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import AddItemForm from '../AddItemForm'

// Mock the useList hook
vi.mock('../../context/ListContext', () => ({
  useList: vi.fn(),
}))

import { useList } from '../../context/ListContext'
const mockUseList = useList as any
const mockAddItem = vi.fn()

describe('AddItemForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseList.mockReturnValue({
      addItem: mockAddItem,
    })
  })

  it('renders input field and add button', () => {
    render(<AddItemForm />)
    
    expect(screen.getByPlaceholderText('Add new item...')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add item/i })).toBeInTheDocument()
  })

  it('updates input value when typing', async () => {
    const user = userEvent.setup()
    render(<AddItemForm />)
    
    const input = screen.getByPlaceholderText('Add new item...')
    await user.type(input, 'Test item')
    
    expect(input).toHaveValue('Test item')
  })

  it('shows character count', async () => {
    const user = userEvent.setup()
    render(<AddItemForm />)
    
    const input = screen.getByPlaceholderText('Add new item...')
    await user.type(input, 'Test')
    
    expect(screen.getByText('4/500 characters')).toBeInTheDocument()
  })

  it('disables submit button when input is empty', () => {
    render(<AddItemForm />)
    
    const button = screen.getByRole('button', { name: /add item/i })
    expect(button).toBeDisabled()
  })

  it('enables submit button when input has text', async () => {
    const user = userEvent.setup()
    render(<AddItemForm />)
    
    const input = screen.getByPlaceholderText('Add new item...')
    const button = screen.getByRole('button', { name: /add item/i })
    
    await user.type(input, 'Test item')
    expect(button).toBeEnabled()
  })

  it('clears input after successful submission', async () => {
    const user = userEvent.setup()
    mockAddItem.mockResolvedValue(undefined)

    render(<AddItemForm />)
    
    const input = screen.getByPlaceholderText('Add new item...')
    const button = screen.getByRole('button', { name: /add item/i })
    
    await user.type(input, 'Test item')
    await user.click(button)
    
    await waitFor(() => {
      expect(input).toHaveValue('')
    })
  })

  it('shows loading state during submission', async () => {
    const user = userEvent.setup()
    
    // Mock API call with delay
    mockAddItem.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve(undefined), 100))
    )

    render(<AddItemForm />)
    
    const input = screen.getByPlaceholderText('Add new item...')
    const button = screen.getByRole('button', { name: /add item/i })
    
    await user.type(input, 'Test item')
    await user.click(button)
    
    expect(screen.getByText('Creating...')).toBeInTheDocument()
    expect(button).toBeDisabled()
  })

  it('shows error message on failed submission', async () => {
    const user = userEvent.setup()
    
    // Mock API call failure
    mockAddItem.mockRejectedValue(new Error('Network error'))

    render(<AddItemForm />)
    
    const input = screen.getByPlaceholderText('Add new item...')
    const button = screen.getByRole('button', { name: /add item/i })
    
    await user.type(input, 'Test item')
    await user.click(button)
    
    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument()
    })
  })

  it('clears error when user starts typing', async () => {
    const user = userEvent.setup()
    
    // Mock API call failure
    mockAddItem.mockRejectedValue(new Error('Network error'))

    render(<AddItemForm />)
    
    const input = screen.getByPlaceholderText('Add new item...')
    const button = screen.getByRole('button', { name: /add item/i })
    
    await user.type(input, 'Test item')
    await user.click(button)
    
    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument()
    })

    await user.type(input, ' more text')
    expect(screen.queryByText('Network error')).not.toBeInTheDocument()
  })
})