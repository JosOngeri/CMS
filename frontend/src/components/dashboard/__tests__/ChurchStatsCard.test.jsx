import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import ChurchStatsCard from '../ChurchStatsCard'

describe('ChurchStatsCard', () => {
  beforeEach(() => {
    // Mock color palette context
    vi.mock('../../contexts/ColorPaletteContext', () => ({
      useColorPalette: () => ({
        colors: {
          primary: '#4A6FA5',
          secondary: '#6B8E23',
          accent: '#E07A5F',
          success: '#D4A017',
          warning: '#CC8E35',
          error: '#C45C3E',
          surface: '#FAF8F5',
          border: '#E8E4E0',
          text: '#2C3E50',
          textSecondary: '#5D6D7E'
        }
      })
    }))
  })

  it('renders with default props', () => {
    render(<ChurchStatsCard title="Test Stat" value="100" />)
    
    expect(screen.getByText('Test Stat')).toBeInTheDocument()
    expect(screen.getByText('100')).toBeInTheDocument()
  })

  it('renders with different stat types', () => {
    const { rerender } = render(<ChurchStatsCard title="Members" value="50" statType="members" />)
    expect(screen.getByText('Members')).toBeInTheDocument()
    
    rerender(<ChurchStatsCard title="Financial" value="$1000" statType="financial" />)
    expect(screen.getByText('Financial')).toBeInTheDocument()
    
    rerender(<ChurchStatsCard title="Events" value="5" statType="events" />)
    expect(screen.getByText('Events')).toBeInTheDocument()
    
    rerender(<ChurchStatsCard title="Engagement" value="85%" statType="engagement" />)
    expect(screen.getByText('Engagement')).toBeInTheDocument()
  })

  it('renders loading state', () => {
    render(<ChurchStatsCard title="Test Stat" value="100" isLoading={true} />)
    
    expect(screen.queryByText('100')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('renders error state', () => {
    render(<ChurchStatsCard title="Test Stat" value="100" error={true} />)
    
    expect(screen.getByText('Error loading data')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('renders change indicator', () => {
    render(<ChurchStatsCard title="Test Stat" value="100" change="+10%" changeType="positive" trendPeriod="this month" />)
    
    expect(screen.getByText('↑')).toBeInTheDocument()
    expect(screen.getByText('+10%')).toBeInTheDocument()
    expect(screen.getByText('this month')).toBeInTheDocument()
  })

  it('renders subtitle', () => {
    render(<ChurchStatsCard title="Test Stat" value="100" subtitle="Additional info" />)
    
    expect(screen.getByText('Additional info')).toBeInTheDocument()
  })

  it('is keyboard accessible', () => {
    render(<ChurchStatsCard title="Test Stat" value="100" onClick={() => {}} />)
    
    const card = screen.getByRole('button')
    expect(card).toHaveAttribute('tabIndex', '0')
    expect(card).toHaveAttribute('aria-label')
  })

  it('handles keyboard navigation', () => {
    const handleClick = vi.fn()
    render(<ChurchStatsCard title="Test Stat" value="100" onClick={handleClick} />)
    
    const card = screen.getByRole('button')
    
    fireEvent.keyDown(card, { key: 'Enter' })
    expect(handleClick).toHaveBeenCalledTimes(1)
    
    fireEvent.keyDown(card, { key: ' ' })
    expect(handleClick).toHaveBeenCalledTimes(2)
  })

  it('respects reduced motion preference', () => {
    // Mock matchMedia for reduced motion
    window.matchMedia = vi.fn().mockImplementation(query => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))

    render(<ChurchStatsCard title="Test Stat" value="100" />)
    
    // Component should render without errors when reduced motion is preferred
    expect(screen.getByText('Test Stat')).toBeInTheDocument()
  })

  it('has proper ARIA labels', () => {
    render(<ChurchStatsCard title="Test Stat" value="100" change="+5%" changeType="positive" />)
    
    const card = screen.getByLabelText(/Test Stat.*100.*increased by \+5%/)
    expect(card).toBeInTheDocument()
  })

  it('supports large text mode', () => {
    document.documentElement.classList.add('large-text')
    
    render(<ChurchStatsCard title="Test Stat" value="100" />)
    
    const card = screen.getByRole('button')
    expect(card).toBeInTheDocument()
    
    document.documentElement.classList.remove('large-text')
  })

  it('supports high contrast mode', () => {
    document.documentElement.classList.add('high-contrast')
    
    render(<ChurchStatsCard title="Test Stat" value="100" />)
    
    const card = screen.getByRole('button')
    expect(card).toBeInTheDocument()
    
    document.documentElement.classList.remove('high-contrast')
  })
})