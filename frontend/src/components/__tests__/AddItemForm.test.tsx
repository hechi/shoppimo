import { render, screen, waitFor } from '../../test/test-utils'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import AddItemForm from '../AddItemForm'

// Mock the useList hook
vi.mock('../../context/ListContext', () => ({
  useList: vi.fn(),
}))

// Mock the autocomplete service
vi.mock('../../services/autocomplete', () => ({
  default: {
    getSuggestions: vi.fn(),
    addItem: vi.fn(),
    clearHistory: vi.fn(),
    getHistorySize: vi.fn(),
  },
}))

import { useList } from '../../context/ListContext'
import autocompleteService from '../../services/autocomplete'

const mockUseList = useList as any
const mockAddItem = vi.fn()
const mockGetSuggestions = autocompleteService.getSuggestions as any
const mockAddAutocompleteItem = autocompleteService.addItem as any

describe('AddItemForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseList.mockReturnValue({
      addItem: mockAddItem,
    })
    mockGetSuggestions.mockReturnValue([])
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

  it('shows dropdown when typing 1+ characters', async () => {
    const user = userEvent.setup()
    mockGetSuggestions.mockReturnValue(['Apple', 'Apricot'])

    render(<AddItemForm />)
    
    const input = screen.getByPlaceholderText('Add new item...')
    await user.type(input, 'A')
    
    expect(screen.getByTestId('autocomplete-dropdown')).toBeInTheDocument()
    expect(screen.getAllByTestId('autocomplete-suggestion')).toHaveLength(2)
  })

  it('hides dropdown when input is empty', async () => {
    const user = userEvent.setup()
    mockGetSuggestions.mockReturnValue(['Apple', 'Apricot'])

    render(<AddItemForm />)
    
    const input = screen.getByPlaceholderText('Add new item...')
    await user.type(input, 'A')
    expect(screen.getByTestId('autocomplete-dropdown')).toBeInTheDocument()

    await user.clear(input)
    expect(screen.queryByTestId('autocomplete-dropdown')).not.toBeInTheDocument()
  })

  it('hides dropdown on escape key', async () => {
    const user = userEvent.setup()
    mockGetSuggestions.mockReturnValue(['Apple', 'Apricot'])

    render(<AddItemForm />)
    
    const input = screen.getByPlaceholderText('Add new item...')
    await user.type(input, 'A')
    expect(screen.getByTestId('autocomplete-dropdown')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByTestId('autocomplete-dropdown')).not.toBeInTheDocument()
  })

  it('fills input with selected suggestion', async () => {
    const user = userEvent.setup()
    mockGetSuggestions.mockReturnValue(['Apple Pie', 'Apricot Jam'])

    render(<AddItemForm />)
    
    const input = screen.getByPlaceholderText('Add new item...')
    await user.type(input, 'Ap')
    
    const suggestions = screen.getAllByTestId('autocomplete-suggestion')
    await user.click(suggestions[0])
    
    expect(input).toHaveValue('Apple Pie')
  })

  it('hides dropdown after selecting suggestion', async () => {
    const user = userEvent.setup()
    mockGetSuggestions.mockReturnValue(['Apple Pie', 'Apricot Jam'])

    render(<AddItemForm />)
    
    const input = screen.getByPlaceholderText('Add new item...')
    await user.type(input, 'Ap')
    
    const suggestions = screen.getAllByTestId('autocomplete-suggestion')
    await user.click(suggestions[0])
    
    expect(screen.queryByTestId('autocomplete-dropdown')).not.toBeInTheDocument()
  })

  it('calls autocompleteService.addItem on successful submit', async () => {
    const user = userEvent.setup()
    mockAddItem.mockResolvedValue(undefined)

    render(<AddItemForm />)
    
    const input = screen.getByPlaceholderText('Add new item...')
    const button = screen.getByRole('button', { name: /add item/i })
    
    await user.type(input, 'Test item')
    await user.click(button)
    
    await waitFor(() => {
      expect(mockAddAutocompleteItem).toHaveBeenCalledWith('Test item')
    })
  })

  it('hides dropdown after form submission', async () => {
    const user = userEvent.setup()
    mockAddItem.mockResolvedValue(undefined)
    mockGetSuggestions.mockReturnValue(['Test', 'Testing'])

    render(<AddItemForm />)
    
    const input = screen.getByPlaceholderText('Add new item...')
    const button = screen.getByRole('button', { name: /add item/i })
    
    await user.type(input, 'Test')
    expect(screen.getByTestId('autocomplete-dropdown')).toBeInTheDocument()
    
    await user.click(button)
    
    await waitFor(() => {
      expect(screen.queryByTestId('autocomplete-dropdown')).not.toBeInTheDocument()
    })
  })

  it('focuses input after selecting suggestion', async () => {
    const user = userEvent.setup()
    mockGetSuggestions.mockReturnValue(['Apple Pie'])

    render(<AddItemForm />)
    
    const input = screen.getByPlaceholderText('Add new item...')
    await user.type(input, 'A')
    
    const suggestion = screen.getByTestId('autocomplete-suggestion')
    await user.click(suggestion)
    
    expect(input).toHaveFocus()
  })
})
