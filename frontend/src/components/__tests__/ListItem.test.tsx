import { render, screen, waitFor } from '../../test/test-utils'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import ListItem from '../ListItem'
import { ListItem as ListItemType } from '../../types'

const mockItem: ListItemType = {
  id: '1',
  text: 'Test item',
  completed: false,
  createdAt: new Date().toISOString(),
  order: 1,
}

const mockCompletedItem: ListItemType = {
  ...mockItem,
  id: '2',
  text: 'Completed item',
  completed: true,
}

describe('ListItem', () => {
  const mockOnUpdate = vi.fn()
  const mockOnDelete = vi.fn()
  const mockOnToggle = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders item text and checkbox', () => {
    render(
      <ListItem
        item={mockItem}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        onToggle={mockOnToggle}
      />
    )
    
    expect(screen.getByText('Test item')).toBeInTheDocument()
    expect(screen.getByRole('checkbox')).toBeInTheDocument()
    expect(screen.getByRole('checkbox')).not.toBeChecked()
  })

  it('shows completed item with strikethrough', () => {
    render(
      <ListItem
        item={mockCompletedItem}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        onToggle={mockOnToggle}
      />
    )
    
    const itemText = screen.getByText('Completed item')
    expect(itemText).toHaveClass('line-through')
    expect(screen.getByRole('checkbox')).toBeChecked()
  })

  it('calls onToggle when checkbox is clicked', async () => {
    const user = userEvent.setup()
    render(
      <ListItem
        item={mockItem}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        onToggle={mockOnToggle}
      />
    )
    
    const checkbox = screen.getByRole('checkbox')
    await user.click(checkbox)
    
    expect(mockOnToggle).toHaveBeenCalledWith('1')
  })

  it('enters edit mode when item text is clicked', async () => {
    const user = userEvent.setup()
    render(
      <ListItem
        item={mockItem}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        onToggle={mockOnToggle}
      />
    )
    
    const itemText = screen.getByText('Test item')
    await user.click(itemText)
    
    expect(screen.getByDisplayValue('Test item')).toBeInTheDocument()
  })

  it('does not enter edit mode when completed item text is clicked', async () => {
    const user = userEvent.setup()
    render(
      <ListItem
        item={mockCompletedItem}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        onToggle={mockOnToggle}
      />
    )
    
    const itemText = screen.getByText('Completed item')
    await user.click(itemText)
    
    expect(screen.queryByDisplayValue('Completed item')).not.toBeInTheDocument()
  })

  it('saves changes when Enter is pressed', async () => {
    const user = userEvent.setup()
    mockOnUpdate.mockResolvedValue(undefined)
    
    render(
      <ListItem
        item={mockItem}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        onToggle={mockOnToggle}
      />
    )
    
    const itemText = screen.getByText('Test item')
    await user.click(itemText)
    
    const input = screen.getByDisplayValue('Test item')
    await user.clear(input)
    await user.type(input, 'Updated item')
    await user.keyboard('{Enter}')
    
    expect(mockOnUpdate).toHaveBeenCalledWith('1', 'Updated item')
  })

  it('cancels edit when Escape is pressed', async () => {
    const user = userEvent.setup()
    render(
      <ListItem
        item={mockItem}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        onToggle={mockOnToggle}
      />
    )
    
    const itemText = screen.getByText('Test item')
    await user.click(itemText)
    
    const input = screen.getByDisplayValue('Test item')
    await user.clear(input)
    await user.type(input, 'Updated item')
    await user.keyboard('{Escape}')
    
    expect(screen.getByText('Test item')).toBeInTheDocument()
    expect(mockOnUpdate).not.toHaveBeenCalled()
  })

  it('does not save empty text', async () => {
    const user = userEvent.setup()
    render(
      <ListItem
        item={mockItem}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        onToggle={mockOnToggle}
      />
    )
    
    const itemText = screen.getByText('Test item')
    await user.click(itemText)
    
    const input = screen.getByDisplayValue('Test item')
    await user.clear(input)
    await user.keyboard('{Enter}')
    
    expect(screen.getByText('Test item')).toBeInTheDocument()
    expect(mockOnUpdate).not.toHaveBeenCalled()
  })

  it('shows delete confirmation when delete button is clicked', async () => {
    const user = userEvent.setup()
    render(
      <ListItem
        item={mockItem}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        onToggle={mockOnToggle}
      />
    )
    
    const deleteButton = screen.getByTitle('Delete item')
    await user.click(deleteButton)
    
    expect(screen.getByTitle('Confirm delete')).toBeInTheDocument()
    expect(screen.getByTitle('Cancel delete')).toBeInTheDocument()
  })

  it('calls onDelete when delete is confirmed', async () => {
    const user = userEvent.setup()
    mockOnDelete.mockResolvedValue(undefined)
    
    render(
      <ListItem
        item={mockItem}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        onToggle={mockOnToggle}
      />
    )
    
    const deleteButton = screen.getByTitle('Delete item')
    await user.click(deleteButton)
    
    const confirmButton = screen.getByTitle('Confirm delete')
    await user.click(confirmButton)
    
    expect(mockOnDelete).toHaveBeenCalledWith('1')
  })

  it('cancels delete when cancel is clicked', async () => {
    const user = userEvent.setup()
    render(
      <ListItem
        item={mockItem}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        onToggle={mockOnToggle}
      />
    )
    
    const deleteButton = screen.getByTitle('Delete item')
    await user.click(deleteButton)
    
    const cancelButton = screen.getByTitle('Cancel delete')
    await user.click(cancelButton)
    
    expect(screen.queryByTitle('Confirm delete')).not.toBeInTheDocument()
    expect(mockOnDelete).not.toHaveBeenCalled()
  })

  it('shows loading indicator during update', async () => {
    const user = userEvent.setup()
    
    // Mock update with delay
    mockOnUpdate.mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 100))
    )
    
    render(
      <ListItem
        item={mockItem}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        onToggle={mockOnToggle}
      />
    )
    
    const itemText = screen.getByText('Test item')
    await user.click(itemText)
    
    const input = screen.getByDisplayValue('Test item')
    await user.clear(input)
    await user.type(input, 'Updated item')
    await user.keyboard('{Enter}')
    
    // Check for loading spinner
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })
})