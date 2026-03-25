import { render, screen } from '../../test/test-utils'
import ExpirationIndicator from '../ExpirationIndicator'

describe('ExpirationIndicator', () => {
  it('should not render when no expiresAt is provided', () => {
    const { container } = render(<ExpirationIndicator />)
    expect(container.firstChild).toBeNull()
  })

  it('should not render when expiration is more than 7 days away', () => {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 10)
    
    const { container } = render(<ExpirationIndicator expiresAt={futureDate.toISOString()} />)
    expect(container.firstChild).toBeNull()
  })

  it('should render warning for expiration tomorrow', () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    render(<ExpirationIndicator expiresAt={tomorrow.toISOString()} />)
    expect(screen.getByText('This list expires tomorrow')).toBeInTheDocument()
  })

  it('should render urgent warning for expiration today', () => {
    const today = new Date()
    
    render(<ExpirationIndicator expiresAt={today.toISOString()} />)
    expect(screen.getByText('This list expires today')).toBeInTheDocument()
  })

  it('should render days countdown for expiration in multiple days', () => {
    const threeDaysFromNow = new Date()
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)
    
    render(<ExpirationIndicator expiresAt={threeDaysFromNow.toISOString()} />)
    expect(screen.getByText('This list expires in 3 days')).toBeInTheDocument()
  })

  it('should have appropriate styling for urgent expiration', () => {
    const today = new Date()
    
    render(<ExpirationIndicator expiresAt={today.toISOString()} />)
    const indicator = screen.getByText('This list expires today').closest('div')
    expect(indicator).toHaveClass('bg-red-50', 'border-red-200', 'text-red-800')
  })

  it('should have appropriate styling for warning expiration', () => {
    const threeDaysFromNow = new Date()
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)
    
    render(<ExpirationIndicator expiresAt={threeDaysFromNow.toISOString()} />)
    const indicator = screen.getByText('This list expires in 3 days').closest('div')
    expect(indicator).toHaveClass('bg-orange-50', 'border-orange-200', 'text-orange-800')
  })

  it('should have appropriate styling for normal expiration', () => {
    const fiveDaysFromNow = new Date()
    fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5)
    
    render(<ExpirationIndicator expiresAt={fiveDaysFromNow.toISOString()} />)
    const indicator = screen.getByText('This list expires in 5 days').closest('div')
    expect(indicator).toHaveClass('bg-yellow-50', 'border-yellow-200', 'text-yellow-800')
  })
})