import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import SystemOrganismViz from '../SystemOrganismViz'

describe('SystemOrganismViz', () => {
  beforeEach(() => {
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

  it('renders with default data', () => {
    render(<SystemOrganismViz />)
    
    expect(screen.getByText('System Organism')).toBeInTheDocument()
    expect(screen.getByText('System Organism Overview')).toBeInTheDocument()
  })

  it('renders with custom system data', () => {
    const customData = {
      totalServices: 10,
      activeServices: 9,
      degradedServices: 1,
      systemUptime: 99.5
    }
    
    render(<SystemOrganismViz systemData={customData} />)
    
    expect(screen.getByText('System Organism')).toBeInTheDocument()
    expect(screen.getByText('90%')).toBeInTheDocument()
  })

  it('renders component health tab', () => {
    render(<SystemOrganismViz />)
    
    const healthTab = screen.getByText('Component Health')
    fireEvent.click(healthTab)
    
    expect(screen.getByText('Component Health')).toBeInTheDocument()
  })

  it('renders performance tab', () => {
    render(<SystemOrganismViz />)
    
    const performanceTab = screen.getByText('Performance')
    fireEvent.click(performanceTab)
    
    expect(screen.getByText('System Performance')).toBeInTheDocument()
  })

  it('is keyboard accessible', () => {
    render(<SystemOrganismViz />)
    
    const tabs = screen.getAllByRole('button')
    tabs.forEach(tab => {
      expect(tab).toHaveAttribute('aria-pressed')
    })
  })

  it('supports large text mode', () => {
    document.documentElement.classList.add('large-text')
    
    render(<SystemOrganismViz />)
    
    expect(screen.getByText('System Organism')).toBeInTheDocument()
    
    document.documentElement.classList.remove('large-text')
  })

  it('supports high contrast mode', () => {
    document.documentElement.classList.add('high-contrast')
    
    render(<SystemOrganismViz />)
    
    expect(screen.getByText('System Organism')).toBeInTheDocument()
    
    document.documentElement.classList.remove('high-contrast')
  })
})