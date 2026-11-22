import { render, screen } from '../../test/test-utils'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import BurgerMenu from '../BurgerMenu'
import { ThemeProvider } from '../../context/ThemeContext'

const mockMatchMedia = (matches: boolean) => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
}

describe('BurgerMenu', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('opens the settings as a modal dialog on small screens', async () => {
    mockMatchMedia(false)
    const showModal = vi.fn()
    HTMLDialogElement.prototype.showModal = showModal
    render(<ThemeProvider><BurgerMenu /></ThemeProvider>)

    await userEvent.click(screen.getByTestId('burger-menu-button'))

    expect(showModal).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('burger-menu-button')).toHaveAttribute('aria-expanded', 'true')
  })

  it('renders a popover instead of a dialog on large screens', () => {
    mockMatchMedia(true)
    render(<ThemeProvider><BurgerMenu /></ThemeProvider>)

    const panel = screen.getByTestId('burger-menu-panel')
    expect(panel).toHaveAttribute('popover', 'auto')
    expect(panel.tagName).not.toBe('DIALOG')
  })
})
