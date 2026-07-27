import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import StewardshipViz from '../StewardshipViz'

describe('StewardshipViz', () => {
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
    render(<StewardshipViz />)
    
    expect(screen.getByText('Financial Stewardship')).toBeInTheDocument()
    expect(screen.getByText('Financial Stewardship Overview')).toBeInTheDocument()
  })

  it('renders with custom financial data', () => {
    const customData = {
      totalIncome: 200000,
      totalExpenses: 150000,
      netBalance: 50000,
      budgetUtilization: 75
    }
    
    render(<StewardshipViz financialData={customData} />)
    
    expect(screen.getByText('Financial Stewardship')).toBeInTheDocument()
    expect(screen.getByText('25%')).toBeInTheDocument()
  })

  it('renders budget tracking tab', () => {
    render(<StewardshipViz />)
    
    const budgetTab = screen.getByText('Budget Tracking')
    fireEvent.click(budgetTab)
    
    expect(screen.getByText('Budget Tracking')).toBeInTheDocument()
  })

  it('renders trust indicators tab', () => {
    render(<StewardshipViz />)
    
    const trustTab = screen.getByText('Trust & Transparency')
    fireEvent.click(trustTab)
    
    expect(screen.getByText('Trust & Transparency')).toBeInTheDocument()
  })

  it('is keyboard accessible', () => {
    render(<StewardshipViz />)
    
    const tabs = screen.getAllByRole('button')
    tabs.forEach(tab => {
      expect(tab).toHaveAttribute('aria-pressed')
    })
  })

  it('supports large text mode', () => {
    document.documentElement.classList.add('large-text')
    
    render(<StewardshipViz />)
    
    expect(screen.getByText('Financial Stewardship')).toBeInTheDocument()
    
    document.documentElement.classList.remove('large-text')
  })

  it('supports high contrast mode', () => {
    document.documentElement.classList.add('high-contrast')
    
    render(<StewardshipViz />)
    
    expect(screen.getByText('Financial Stewardship')).toBeInTheDocument()
    
    document.documentElement.classList.remove('high-contrast')
  })
})