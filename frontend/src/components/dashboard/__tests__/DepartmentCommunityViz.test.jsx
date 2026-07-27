import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import DepartmentCommunityViz from '../DepartmentCommunityViz'

describe('DepartmentCommunityViz', () => {
  beforeEach(() => {
    vi.mock('../../contexts/ColorPaletteContext', () => ({
      useColorPalette: () => ({
        colors: {
          primary: '#4A6FA5',
          secondary: '#6B8E23',
          accent: '#E07A5F',
          success: '#D4A017',
          warning: '#CC8E35',
          surface: '#FAF8F5',
          border: '#E8E4E0',
          text: '#2C3E50',
          textSecondary: '#5D6D7E'
        }
      })
    }))
  })

  it('renders with default data', () => {
    render(<DepartmentCommunityViz />)
    
    expect(screen.getByText('Department Community')).toBeInTheDocument()
    expect(screen.getByText('Department Team Overview')).toBeInTheDocument()
  })

  it('renders with custom team data', () => {
    const customData = {
      totalMembers: 30,
      activeMembers: 25,
      newMembers: 5,
      teamHealth: 90
    }
    
    render(<DepartmentCommunityViz teamData={customData} />)
    
    expect(screen.getByText('Department Community')).toBeInTheDocument()
    expect(screen.getByText('83%')).toBeInTheDocument()
  })

  it('renders activity tab', () => {
    render(<DepartmentCommunityViz />)
    
    const activityTab = screen.getByText('Activity')
    fireEvent.click(activityTab)
    
    expect(screen.getByText('Department Activity')).toBeInTheDocument()
  })

  it('renders coordination tab', () => {
    render(<DepartmentCommunityViz />)
    
    const coordinationTab = screen.getByText('Coordination')
    fireEvent.click(coordinationTab)
    
    expect(screen.getByText('Team Coordination')).toBeInTheDocument()
  })

  it('is keyboard accessible', () => {
    render(<DepartmentCommunityViz />)
    
    const tabs = screen.getAllByRole('button')
    tabs.forEach(tab => {
      expect(tab).toHaveAttribute('aria-pressed')
    })
  })

  it('supports large text mode', () => {
    document.documentElement.classList.add('large-text')
    
    render(<DepartmentCommunityViz />)
    
    expect(screen.getByText('Department Community')).toBeInTheDocument()
    
    document.documentElement.classList.remove('large-text')
  })

  it('supports high contrast mode', () => {
    document.documentElement.classList.add('high-contrast')
    
    render(<DepartmentCommunityViz />)
    
    expect(screen.getByText('Department Community')).toBeInTheDocument()
    
    document.documentElement.classList.remove('high-contrast')
  })
})