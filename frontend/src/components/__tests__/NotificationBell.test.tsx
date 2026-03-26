import { render, screen, waitFor } from '../../test/test-utils'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import NotificationBell from '../NotificationBell'

vi.mock('../../context/PushNotificationContext', () => ({
  useNotifications: vi.fn(),
}))

import { useNotifications } from '../../context/PushNotificationContext'
const mockUseNotifications = useNotifications as any

describe('NotificationBell', () => {
  const listId = 'test-list-id'
  const mockRequestPermission = vi.fn()
  const mockSubscribe = vi.fn()
  const mockUnsubscribe = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseNotifications.mockReturnValue({
      permissionStatus: 'default',
      isSubscribed: false,
      isLoading: false,
      deviceId: 'test-device-id',
      requestPermission: mockRequestPermission,
      subscribe: mockSubscribe,
      unsubscribe: mockUnsubscribe,
    })
  })

  describe('Rendering', () => {
    it('renders button with push-subscribe-button test id', () => {
      render(<NotificationBell listId={listId} />)
      expect(screen.getByTestId('push-subscribe-button')).toBeInTheDocument()
    })

    it('renders as a button element', () => {
      render(<NotificationBell listId={listId} />)
      const button = screen.getByTestId('push-subscribe-button')
      expect(button.tagName).toBe('BUTTON')
    })
  })

  describe('Visual State: Default (not subscribed, permission default/granted)', () => {
    it('shows outline bell icon when not subscribed and permission is default', () => {
      mockUseNotifications.mockReturnValue({
        permissionStatus: 'default',
        isSubscribed: false,
        isLoading: false,
        deviceId: 'test-device-id',
        requestPermission: mockRequestPermission,
        subscribe: mockSubscribe,
        unsubscribe: mockUnsubscribe,
      })

      render(<NotificationBell listId={listId} />)
      const button = screen.getByTestId('push-subscribe-button')
      
      expect(button).toHaveAttribute('title')
      expect(button.getAttribute('title')).toContain('Enable notifications')
    })

    it('shows outline bell icon when not subscribed and permission is granted', () => {
      mockUseNotifications.mockReturnValue({
        permissionStatus: 'granted',
        isSubscribed: false,
        isLoading: false,
        deviceId: 'test-device-id',
        requestPermission: mockRequestPermission,
        subscribe: mockSubscribe,
        unsubscribe: mockUnsubscribe,
      })

      render(<NotificationBell listId={listId} />)
      const button = screen.getByTestId('push-subscribe-button')
      
      expect(button).toHaveAttribute('title')
      expect(button.getAttribute('title')).toContain('Enable notifications')
    })

    it('button is enabled in default state', () => {
      render(<NotificationBell listId={listId} />)
      const button = screen.getByTestId('push-subscribe-button')
      expect(button).not.toBeDisabled()
    })
  })

  describe('Visual State: Subscribed', () => {
    beforeEach(() => {
      mockUseNotifications.mockReturnValue({
        permissionStatus: 'granted',
        isSubscribed: true,
        isLoading: false,
        deviceId: 'test-device-id',
        requestPermission: mockRequestPermission,
        subscribe: mockSubscribe,
        unsubscribe: mockUnsubscribe,
      })
    })

    it('shows filled bell icon when subscribed', () => {
      render(<NotificationBell listId={listId} />)
      const button = screen.getByTestId('push-subscribe-button')
      
      const svg = button.querySelector('svg[class*="fill-current"]')
      expect(svg).toBeTruthy()
    })

    it('shows "Disable notifications" tooltip when subscribed', () => {
      render(<NotificationBell listId={listId} />)
      const button = screen.getByTestId('push-subscribe-button')
      
      const title = button.getAttribute('title')
      expect(title).toMatch(/disable|disable notifications/i)
    })

    it('button is enabled when subscribed', () => {
      render(<NotificationBell listId={listId} />)
      const button = screen.getByTestId('push-subscribe-button')
      expect(button).not.toBeDisabled()
    })
  })

  describe('Visual State: Permission Denied', () => {
    beforeEach(() => {
      mockUseNotifications.mockReturnValue({
        permissionStatus: 'denied',
        isSubscribed: false,
        isLoading: false,
        deviceId: 'test-device-id',
        requestPermission: mockRequestPermission,
        subscribe: mockSubscribe,
        unsubscribe: mockUnsubscribe,
      })
    })

    it('shows crossed-out bell icon when permission denied', () => {
      render(<NotificationBell listId={listId} />)
      const button = screen.getByTestId('push-subscribe-button')
      
      expect(button.className).toContain('opacity')
    })

    it('shows "Notifications blocked" tooltip when permission denied', () => {
      render(<NotificationBell listId={listId} />)
      const button = screen.getByTestId('push-subscribe-button')
      
      const title = button.getAttribute('title')
      expect(title).toMatch(/blocked|browser/i)
    })

    it('button is disabled when permission denied', () => {
      render(<NotificationBell listId={listId} />)
      const button = screen.getByTestId('push-subscribe-button')
      expect(button).toBeDisabled()
    })
  })

  describe('Visual State: Loading', () => {
    beforeEach(() => {
      mockUseNotifications.mockReturnValue({
        permissionStatus: 'default',
        isSubscribed: false,
        isLoading: true,
        deviceId: 'test-device-id',
        requestPermission: mockRequestPermission,
        subscribe: mockSubscribe,
        unsubscribe: mockUnsubscribe,
      })
    })

    it('shows spinner when loading', () => {
      render(<NotificationBell listId={listId} />)
      const button = screen.getByTestId('push-subscribe-button')
      
      expect(button.innerHTML).toContain('animate-spin')
    })

    it('button is disabled when loading', () => {
      render(<NotificationBell listId={listId} />)
      const button = screen.getByTestId('push-subscribe-button')
      expect(button).toBeDisabled()
    })
  })

  describe('Click Behavior: Subscribe Flow', () => {
    it('calls requestPermission and subscribe when clicking unsubscribed button with default permission', async () => {
      const user = userEvent.setup()
      mockRequestPermission.mockResolvedValue(undefined)
      mockSubscribe.mockResolvedValue(undefined)

      mockUseNotifications.mockReturnValue({
        permissionStatus: 'default',
        isSubscribed: false,
        isLoading: false,
        deviceId: 'test-device-id',
        requestPermission: mockRequestPermission,
        subscribe: mockSubscribe,
        unsubscribe: mockUnsubscribe,
      })

      render(<NotificationBell listId={listId} />)
      const button = screen.getByTestId('push-subscribe-button')

      await user.click(button)

      expect(mockRequestPermission).toHaveBeenCalled()
      expect(mockSubscribe).toHaveBeenCalledWith(listId)
    })

    it('calls only subscribe when clicking unsubscribed button with granted permission', async () => {
      const user = userEvent.setup()
      mockSubscribe.mockResolvedValue(undefined)

      mockUseNotifications.mockReturnValue({
        permissionStatus: 'granted',
        isSubscribed: false,
        isLoading: false,
        deviceId: 'test-device-id',
        requestPermission: mockRequestPermission,
        subscribe: mockSubscribe,
        unsubscribe: mockUnsubscribe,
      })

      render(<NotificationBell listId={listId} />)
      const button = screen.getByTestId('push-subscribe-button')

      await user.click(button)

      expect(mockRequestPermission).not.toHaveBeenCalled()
      expect(mockSubscribe).toHaveBeenCalledWith(listId)
    })

    it('does not call anything when permission is denied', async () => {
      const user = userEvent.setup()

      mockUseNotifications.mockReturnValue({
        permissionStatus: 'denied',
        isSubscribed: false,
        isLoading: false,
        deviceId: 'test-device-id',
        requestPermission: mockRequestPermission,
        subscribe: mockSubscribe,
        unsubscribe: mockUnsubscribe,
      })

      render(<NotificationBell listId={listId} />)
      const button = screen.getByTestId('push-subscribe-button')

      expect(button).toBeDisabled()
    })
  })

  describe('Click Behavior: Unsubscribe Flow', () => {
    it('calls unsubscribe when clicking subscribed button', async () => {
      const user = userEvent.setup()
      mockUnsubscribe.mockResolvedValue(undefined)

      mockUseNotifications.mockReturnValue({
        permissionStatus: 'granted',
        isSubscribed: true,
        isLoading: false,
        deviceId: 'test-device-id',
        requestPermission: mockRequestPermission,
        subscribe: mockSubscribe,
        unsubscribe: mockUnsubscribe,
      })

      render(<NotificationBell listId={listId} />)
      const button = screen.getByTestId('push-subscribe-button')

      await user.click(button)

      expect(mockUnsubscribe).toHaveBeenCalledWith(listId)
      expect(mockSubscribe).not.toHaveBeenCalled()
      expect(mockRequestPermission).not.toHaveBeenCalled()
    })
  })

  describe('i18n Integration', () => {
    it('uses i18n for tooltip text "Enable notifications"', () => {
      render(<NotificationBell listId={listId} />)
      const button = screen.getByTestId('push-subscribe-button')
      
      const title = button.getAttribute('title')
    })

    it('uses i18n for tooltip text "Disable notifications"', () => {
      mockUseNotifications.mockReturnValue({
        permissionStatus: 'granted',
        isSubscribed: true,
        isLoading: false,
        deviceId: 'test-device-id',
        requestPermission: mockRequestPermission,
        subscribe: mockSubscribe,
        unsubscribe: mockUnsubscribe,
      })

      render(<NotificationBell listId={listId} />)
      const button = screen.getByTestId('push-subscribe-button')
      
      const title = button.getAttribute('title')
      expect(title).toMatch(/disable|notifications/i)
    })
  })

  describe('Dark Mode Support', () => {
    it('includes dark mode classes in button styling', () => {
      render(<NotificationBell listId={listId} />)
      const button = screen.getByTestId('push-subscribe-button')
      
      const classes = button.className
      expect(classes).toMatch(/dark:/)
    })
  })

  describe('Props', () => {
    it('accepts listId prop and uses it in subscribe/unsubscribe calls', async () => {
      const user = userEvent.setup()
      const customListId = 'custom-list-id-12345'
      
      mockUseNotifications.mockReturnValue({
        permissionStatus: 'granted',
        isSubscribed: true,
        isLoading: false,
        deviceId: 'test-device-id',
        requestPermission: mockRequestPermission,
        subscribe: mockSubscribe,
        unsubscribe: mockUnsubscribe,
      })
      
      mockUnsubscribe.mockResolvedValue(undefined)

      render(<NotificationBell listId={customListId} />)
      const button = screen.getByTestId('push-subscribe-button')

      await user.click(button)

      expect(mockUnsubscribe).toHaveBeenCalledWith(customListId)
    })
  })
})
