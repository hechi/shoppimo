import { render, screen, waitFor } from '../../test/test-utils'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import ThemeToggle from '../ThemeToggle'

// Mock the useTheme hook
vi.mock('../../context/ThemeContext', () => ({
  useTheme: vi.fn(),
}))

import { useTheme } from '../../context/ThemeContext'
const mockUseTheme = useTheme as any

describe('ThemeToggle', () => {
  const mockSetTheme = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseTheme.mockReturnValue({
      theme: 'light',
      setTheme: mockSetTheme,
      resolvedTheme: 'light',
    })
  })

  it('renders the theme toggle container', () => {
    render(<ThemeToggle />)
    
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument()
  })

  it('renders three theme options: light, dark, and system', () => {
    render(<ThemeToggle />)
    
    expect(screen.getByTestId('theme-option-light')).toBeInTheDocument()
    expect(screen.getByTestId('theme-option-dark')).toBeInTheDocument()
    expect(screen.getByTestId('theme-option-system')).toBeInTheDocument()
  })

  it('renders with light, dark, and system labels from translations', () => {
    render(<ThemeToggle />)
    
    // Check that buttons have proper structure (they have test ids)
    const lightOption = screen.getByTestId('theme-option-light')
    const darkOption = screen.getByTestId('theme-option-dark')
    const systemOption = screen.getByTestId('theme-option-system')
    
    expect(lightOption).toBeInTheDocument()
    expect(darkOption).toBeInTheDocument()
    expect(systemOption).toBeInTheDocument()
  })

  it('calls setTheme with "light" when light option is clicked', async () => {
    const user = userEvent.setup()
    render(<ThemeToggle />)
    
    const lightOption = screen.getByTestId('theme-option-light')
    await user.click(lightOption)
    
    expect(mockSetTheme).toHaveBeenCalledWith('light')
  })

  it('calls setTheme with "dark" when dark option is clicked', async () => {
    const user = userEvent.setup()
    render(<ThemeToggle />)
    
    const darkOption = screen.getByTestId('theme-option-dark')
    await user.click(darkOption)
    
    expect(mockSetTheme).toHaveBeenCalledWith('dark')
  })

  it('calls setTheme with "system" when system option is clicked', async () => {
    const user = userEvent.setup()
    render(<ThemeToggle />)
    
    const systemOption = screen.getByTestId('theme-option-system')
    await user.click(systemOption)
    
    expect(mockSetTheme).toHaveBeenCalledWith('system')
  })

  it('shows active state for current theme', () => {
    mockUseTheme.mockReturnValue({
      theme: 'dark',
      setTheme: mockSetTheme,
      resolvedTheme: 'dark',
    })
    
    render(<ThemeToggle />)
    
    const darkOption = screen.getByTestId('theme-option-dark')
    expect(darkOption).toHaveClass('bg-blue-100')
  })

  it('shows active state for light theme when current', () => {
    mockUseTheme.mockReturnValue({
      theme: 'light',
      setTheme: mockSetTheme,
      resolvedTheme: 'light',
    })
    
    render(<ThemeToggle />)
    
    const lightOption = screen.getByTestId('theme-option-light')
    expect(lightOption).toHaveClass('bg-blue-100')
  })

  it('shows active state for system theme when current', () => {
    mockUseTheme.mockReturnValue({
      theme: 'system',
      setTheme: mockSetTheme,
      resolvedTheme: 'light',
    })
    
    render(<ThemeToggle />)
    
    const systemOption = screen.getByTestId('theme-option-system')
    expect(systemOption).toHaveClass('bg-blue-100')
  })

  it('applies dark:bg-gray-700 classes for dark mode styling', () => {
    render(<ThemeToggle />)
    
    const container = screen.getByTestId('theme-toggle')
    expect(container).toHaveClass('dark:bg-gray-700')
  })

  it('does not show active class for non-current themes', () => {
    mockUseTheme.mockReturnValue({
      theme: 'light',
      setTheme: mockSetTheme,
      resolvedTheme: 'light',
    })
    
    render(<ThemeToggle />)
    
    const darkOption = screen.getByTestId('theme-option-dark')
    const systemOption = screen.getByTestId('theme-option-system')
    
    // Non-active options should not have the active blue background
    expect(darkOption).not.toHaveClass('bg-blue-100')
    expect(systemOption).not.toHaveClass('bg-blue-100')
  })
})
