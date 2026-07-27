import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import PersonalGrowthViz from '../PersonalGrowthViz'

describe('PersonalGrowthViz', () => {
  beforeEach(() => {
    // Mock color palette context
    vi.mock('../../contexts/ColorPaletteContext', () => ({
      useColorPalette: () => ({
        colors: {
          primary: '#4A6FA5',
          secondary: '#6B8E23',
          accent: '#E07A5F',
          success: '#D4A017',
          surface: '#FAF8F5',
          border: '#E8E4E0',
          text: '#2C3E50',
          textSecondary: '#5D6D7E'
        }
      })
    }))
  })

  it('renders with default data', () => {
    render(<PersonalGrowthViz />)
    
    expect(screen.getByText('Personal Growth')).toBeInTheDocument()
    expect(screen.getByText('Growth Path')).toBeInTheDocument()
  })

  it('renders with custom growth data', () => {
    const customData = {
      attendanceRate: 90,
      contributionRate: 85,
      activityLevel: 88,
      spiritualGrowth: 82
    }
    
    render(<PersonalGrowthViz growthData={customData} />)
    
    expect(screen.getByText('Personal Growth')).toBeInTheDocument()
    // Should show the custom growth score
    expect(screen.getByText('86%')).toBeInTheDocument()
  })

  it('renders engagement tab', () => {
    render(<PersonalGrowthViz />)
    
    const engagementTab = screen.getByText('Engagement')
    fireEvent.click(engagementTab)
    
    expect(screen.getByText('Community Engagement')).toBeInTheDocument()
  })

  it('renders journey tab', () => {
    render(<PersonalGrowthViz />)
    
    const journeyTab = screen.getByText('Timeline')
    fireEvent.click(journeyTab)
    
    expect(screen.getByText('Spiritual Journey Timeline')).toBeInTheDocument()
  })

  it('renders growth path visualization', () => {
    render(<PersonalGrowthViz />)
    
    expect(screen.getByText('Spiritual Journey Progress')).toBeInTheDocument()
    expect(screen.getByText('Attendance')).toBeInTheDocument()
    expect(screen.getByText('Contributions')).toBeInTheDocument()
  })

  it('renders engagement metrics', () => {
    const engagementData = {
      departmentsInvolved: 4,
      eventsAttended: 15,
      communityService: 8,
      prayerRequests: 12
    }
    
    render(<PersonalGrowthViz engagementData={engagementData} />)
    
    fireEvent.click(screen.getByText('Engagement'))
    
    expect(screen.getByText('4')).toBeInTheDocument()
    expect(screen.getByText('15')).toBeInTheDocument()
  })

  it('renders journey timeline', () => {
    const journeyData = {
      memberSince: '2023-01-15',
      milestones: [
        { date: '2023-02-01', title: 'First Service', type: 'milestone' },
        { date: '2023-06-15', title: 'Baptism', type: 'milestone' }
      ]
    }
    
    render(<PersonalGrowthViz journeyData={journeyData} />)
    
    fireEvent.click(screen.getByText('Timeline'))
    
    expect(screen.getByText('First Service')).toBeInTheDocument()
    expect(screen.getByText('Baptism')).toBeInTheDocument()
  })

  it('is keyboard accessible', () => {
    render(<PersonalGrowthViz />)
    
    const tabs = screen.getAllByRole('button')
    tabs.forEach(tab => {
      expect(tab).toHaveAttribute('aria-pressed')
    })
  })

  it('supports large text mode', () => {
    document.documentElement.classList.add('large-text')
    
    render(<PersonalGrowthViz />)
    
    expect(screen.getByText('Personal Growth')).toBeInTheDocument()
    
    document.documentElement.classList.remove('large-text')
  })

  it('supports high contrast mode', () => {
    document.documentElement.classList.add('high-contrast')
    
    render(<PersonalGrowthViz />)
    
    expect(screen.getByText('Personal Growth')).toBeInTheDocument()
    
    document.documentElement.classList.remove('high-contrast')
  })

  it('respects reduced motion preference', () => {
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

    render(<PersonalGrowthViz />)
    
    expect(screen.getByText('Personal Growth')).toBeInTheDocument()
  })
})