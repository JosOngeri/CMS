import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import MinistryHealthViz from '../MinistryHealthViz'

describe('MinistryHealthViz', () => {
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
    render(<MinistryHealthViz />)
    
    expect(screen.getByText('Ministry Health')).toBeInTheDocument()
    expect(screen.getByText('Ministry Health Overview')).toBeInTheDocument()
  })

  it('renders with custom ministry data', () => {
    const customData = {
      totalMembers: 200,
      activeMembers: 180,
      newMembers: 20,
      memberRetention: 90
    }
    
    render(<MinistryHealthViz ministryData={customData} />)
    
    expect(screen.getByText('Ministry Health')).toBeInTheDocument()
    expect(screen.getByText('90%')).toBeInTheDocument()
  })

  it('renders congregation tab', () => {
    render(<MinistryHealthViz />)
    
    const congregationTab = screen.getByText('Congregation')
    fireEvent.click(congregationTab)
    
    expect(screen.getByText('Congregation Engagement')).toBeInTheDocument()
  })

  it('renders departments tab', () => {
    render(<MinistryHealthViz />)
    
    const departmentsTab = screen.getByText('Departments')
    fireEvent.click(departmentsTab)
    
    expect(screen.getByText('Department Health')).toBeInTheDocument()
  })

  it('is keyboard accessible', () => {
    render(<MinistryHealthViz />)
    
    const tabs = screen.getAllByRole('button')
    tabs.forEach(tab => {
      expect(tab).toHaveAttribute('aria-pressed')
    })
  })

  it('supports large text mode', () => {
    document.documentElement.classList.add('large-text')
    
    render(<MinistryHealthViz />)
    
    expect(screen.getByText('Ministry Health')).toBeInTheDocument()
    
    document.documentElement.classList.remove('large-text')
  })

  it('supports high contrast mode', () => {
    document.documentElement.classList.add('high-contrast')
    
    render(<MinistryHealthViz />)
    
    expect(screen.getByText('Ministry Health')).toBeInTheDocument()
    
    document.documentElement.classList.remove('high-contrast')
  })
})