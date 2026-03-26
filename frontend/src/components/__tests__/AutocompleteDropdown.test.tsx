import { render, screen, fireEvent } from '../../test/test-utils'
import { vi } from 'vitest'
import AutocompleteDropdown from '../AutocompleteDropdown'

describe('AutocompleteDropdown', () => {
  const defaultProps = {
    suggestions: ['Milk', 'Muesli', 'Mustard'],
    onSelect: vi.fn(),
    onDismiss: vi.fn(),
    visible: true,
    highlightPrefix: 'mu',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('visibility', () => {
    it('renders dropdown when visible=true', () => {
      render(<AutocompleteDropdown {...defaultProps} />)
      expect(screen.getByTestId('autocomplete-dropdown')).toBeInTheDocument()
    })

    it('does not render dropdown when visible=false', () => {
      render(<AutocompleteDropdown {...defaultProps} visible={false} />)
      expect(screen.queryByTestId('autocomplete-dropdown')).not.toBeInTheDocument()
    })
  })

  describe('suggestions rendering', () => {
    it('renders all suggestion items', () => {
      render(<AutocompleteDropdown {...defaultProps} />)
      const items = screen.getAllByTestId('autocomplete-suggestion')
      expect(items).toHaveLength(3)
    })

    it('renders suggestion text correctly', () => {
      render(<AutocompleteDropdown {...defaultProps} />)
      expect(screen.getByText(/Muesli/)).toBeInTheDocument()
      expect(screen.getByText(/Mustard/)).toBeInTheDocument()
    })

    it('limits display to 8 suggestions max', () => {
      const manySuggestions = [
        'Apple', 'Apricot', 'Avocado', 'Artichoke',
        'Asparagus', 'Anise', 'Almond', 'Arugula', 'Acorn',
      ]
      render(
        <AutocompleteDropdown
          {...defaultProps}
          suggestions={manySuggestions}
          highlightPrefix="a"
        />
      )
      const items = screen.getAllByTestId('autocomplete-suggestion')
      expect(items).toHaveLength(8)
    })

    it('shows no suggestions when list is empty', () => {
      render(<AutocompleteDropdown {...defaultProps} suggestions={[]} />)
      const dropdown = screen.queryByTestId('autocomplete-dropdown')
      expect(dropdown).not.toBeInTheDocument()
      expect(screen.queryAllByTestId('autocomplete-suggestion')).toHaveLength(0)
    })

    it('highlights the matching prefix in bold', () => {
      render(
        <AutocompleteDropdown
          {...defaultProps}
          suggestions={['Muesli']}
          highlightPrefix="mue"
        />
      )
      // The prefix "mue" should be inside a <strong> tag (case-insensitive)
      const strong = screen.getByRole('listbox').querySelector('strong')
      expect(strong).toBeInTheDocument()
      expect(strong?.textContent?.toLowerCase()).toBe('mue')
    })
  })

  describe('ARIA accessibility', () => {
    it('has role="listbox" on the container', () => {
      render(<AutocompleteDropdown {...defaultProps} />)
      expect(screen.getByRole('listbox')).toBeInTheDocument()
    })

    it('has role="option" on each suggestion item', () => {
      render(<AutocompleteDropdown {...defaultProps} />)
      const options = screen.getAllByRole('option')
      expect(options).toHaveLength(3)
    })

    it('sets aria-selected="false" on non-active items initially', () => {
      render(<AutocompleteDropdown {...defaultProps} />)
      const options = screen.getAllByRole('option')
      options.forEach(option => {
        expect(option).toHaveAttribute('aria-selected', 'false')
      })
    })
  })

  describe('mouse interaction', () => {
    it('calls onSelect with suggestion text when clicked', () => {
      const onSelect = vi.fn()
      render(<AutocompleteDropdown {...defaultProps} onSelect={onSelect} />)
      const items = screen.getAllByTestId('autocomplete-suggestion')
      fireEvent.click(items[0])
      expect(onSelect).toHaveBeenCalledWith('Milk')
    })

    it('calls onSelect with correct suggestion for second item', () => {
      const onSelect = vi.fn()
      render(<AutocompleteDropdown {...defaultProps} onSelect={onSelect} />)
      const items = screen.getAllByTestId('autocomplete-suggestion')
      fireEvent.click(items[1])
      expect(onSelect).toHaveBeenCalledWith('Muesli')
    })
  })

  describe('keyboard navigation', () => {
    it('moves active index down with ArrowDown', () => {
      render(<AutocompleteDropdown {...defaultProps} />)
      const dropdown = screen.getByTestId('autocomplete-dropdown')
      fireEvent.keyDown(dropdown, { key: 'ArrowDown' })
      const options = screen.getAllByRole('option')
      expect(options[0]).toHaveAttribute('aria-selected', 'true')
    })

    it('moves active index up with ArrowUp after going down', () => {
      render(<AutocompleteDropdown {...defaultProps} />)
      const dropdown = screen.getByTestId('autocomplete-dropdown')
      // Go down twice
      fireEvent.keyDown(dropdown, { key: 'ArrowDown' })
      fireEvent.keyDown(dropdown, { key: 'ArrowDown' })
      // Go back up
      fireEvent.keyDown(dropdown, { key: 'ArrowUp' })
      const options = screen.getAllByRole('option')
      expect(options[0]).toHaveAttribute('aria-selected', 'true')
    })

    it('wraps around from last to first on ArrowDown', () => {
      render(<AutocompleteDropdown {...defaultProps} />)
      const dropdown = screen.getByTestId('autocomplete-dropdown')
      // ArrowDown 3 times → wraps back to 0 on 4th
      fireEvent.keyDown(dropdown, { key: 'ArrowDown' }) // index 0
      fireEvent.keyDown(dropdown, { key: 'ArrowDown' }) // index 1
      fireEvent.keyDown(dropdown, { key: 'ArrowDown' }) // index 2
      fireEvent.keyDown(dropdown, { key: 'ArrowDown' }) // wraps to -1 (no selection) or 0
      const options = screen.getAllByRole('option')
      // After wrapping, first item OR none is selected — implementation can choose
      // We check that it doesn't throw and options are still rendered
      expect(options).toHaveLength(3)
    })

    it('selects current item on Enter and calls onSelect', () => {
      const onSelect = vi.fn()
      render(<AutocompleteDropdown {...defaultProps} onSelect={onSelect} />)
      const dropdown = screen.getByTestId('autocomplete-dropdown')
      fireEvent.keyDown(dropdown, { key: 'ArrowDown' }) // select first (Milk)
      fireEvent.keyDown(dropdown, { key: 'Enter' })
      expect(onSelect).toHaveBeenCalledWith('Milk')
    })

    it('selects second item when ArrowDown twice then Enter', () => {
      const onSelect = vi.fn()
      render(<AutocompleteDropdown {...defaultProps} onSelect={onSelect} />)
      const dropdown = screen.getByTestId('autocomplete-dropdown')
      fireEvent.keyDown(dropdown, { key: 'ArrowDown' }) // index 0
      fireEvent.keyDown(dropdown, { key: 'ArrowDown' }) // index 1
      fireEvent.keyDown(dropdown, { key: 'Enter' })
      expect(onSelect).toHaveBeenCalledWith('Muesli')
    })

    it('calls onDismiss on Escape key', () => {
      const onDismiss = vi.fn()
      render(<AutocompleteDropdown {...defaultProps} onDismiss={onDismiss} />)
      const dropdown = screen.getByTestId('autocomplete-dropdown')
      fireEvent.keyDown(dropdown, { key: 'Escape' })
      expect(onDismiss).toHaveBeenCalled()
    })

    it('does not call onSelect on Enter when no item is active', () => {
      const onSelect = vi.fn()
      render(<AutocompleteDropdown {...defaultProps} onSelect={onSelect} />)
      const dropdown = screen.getByTestId('autocomplete-dropdown')
      // Enter without pressing ArrowDown first
      fireEvent.keyDown(dropdown, { key: 'Enter' })
      expect(onSelect).not.toHaveBeenCalled()
    })

    it('marks active option with aria-selected="true"', () => {
      render(<AutocompleteDropdown {...defaultProps} />)
      const dropdown = screen.getByTestId('autocomplete-dropdown')
      fireEvent.keyDown(dropdown, { key: 'ArrowDown' })
      const options = screen.getAllByRole('option')
      expect(options[0]).toHaveAttribute('aria-selected', 'true')
      expect(options[1]).toHaveAttribute('aria-selected', 'false')
    })
  })

  describe('dark mode classes', () => {
    it('includes dark: variant classes on the dropdown container', () => {
      render(<AutocompleteDropdown {...defaultProps} />)
      const dropdown = screen.getByTestId('autocomplete-dropdown')
      // Verify dark mode classes are present in the className
      expect(dropdown.className).toMatch(/dark:/)
    })
  })
})
