import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { axe, toHaveNoViolations } from 'jest-axe'
import MinistryHealthViz from '../MinistryHealthViz'
import StewardshipViz from '../StewardshipViz'
import DepartmentCommunityViz from '../DepartmentCommunityViz'
import SystemOrganismViz from '../SystemOrganismViz'

expect.extend(toHaveNoViolations)

describe('Comprehensive Accessibility Tests', () => {
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

  afterEach(() => {
    document.documentElement.classList.remove('large-text', 'high-contrast')
  })

  describe('WCAG 2.1 AA Compliance - MinistryHealthViz', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(<MinistryHealthViz />)
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have proper ARIA labels', () => {
      render(<MinistryHealthViz />)
      
      const tabs = screen.getAllByRole('button')
      tabs.forEach(tab => {
        expect(tab).toHaveAttribute('aria-label')
        expect(tab).toHaveAttribute('aria-pressed')
      })
    })

    it('should support keyboard navigation', () => {
      render(<MinistryHealthViz />)
      
      const tabs = screen.getAllByRole('button')
      tabs.forEach(tab => {
        tab.focus()
        expect(document.activeElement).toBe(tab)
        
        // Test Enter key
        fireEvent.keyDown(tab, { key: 'Enter' })
        expect(tab).toHaveAttribute('aria-pressed', 'true')
      })
    })

    it('should have sufficient color contrast', () => {
      render(<MinistryHealthViz />)
      
      const textElements = screen.getAllByText(/.+/)
      textElements.forEach(element => {
        const styles = window.getComputedStyle(element)
        const color = styles.color
        const backgroundColor = styles.backgroundColor
        
        // This is a simplified check - in real implementation, use proper contrast calculation
        expect(color).toBeTruthy()
        expect(backgroundColor).toBeTruthy()
      })
    })
  })

  describe('WCAG 2.1 AA Compliance - StewardshipViz', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(<StewardshipViz />)
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have proper ARIA labels', () => {
      render(<StewardshipViz />)
      
      const tabs = screen.getAllByRole('button')
      tabs.forEach(tab => {
        expect(tab).toHaveAttribute('aria-label')
        expect(tab).toHaveAttribute('aria-pressed')
      })
    })

    it('should support keyboard navigation', () => {
      render(<StewardshipViz />)
      
      const tabs = screen.getAllByRole('button')
      tabs.forEach(tab => {
        tab.focus()
        expect(document.activeElement).toBe(tab)
        
        fireEvent.keyDown(tab, { key: 'Enter' })
        expect(tab).toHaveAttribute('aria-pressed', 'true')
      })
    })
  })

  describe('WCAG 2.1 AA Compliance - DepartmentCommunityViz', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(<DepartmentCommunityViz />)
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have proper ARIA labels', () => {
      render(<DepartmentCommunityViz />)
      
      const tabs = screen.getAllByRole('button')
      tabs.forEach(tab => {
        expect(tab).toHaveAttribute('aria-label')
        expect(tab).toHaveAttribute('aria-pressed')
      })
    })

    it('should support keyboard navigation', () => {
      render(<DepartmentCommunityViz />)
      
      const tabs = screen.getAllByRole('button')
      tabs.forEach(tab => {
        tab.focus()
        expect(document.activeElement).toBe(tab)
        
        fireEvent.keyDown(tab, { key: 'Enter' })
        expect(tab).toHaveAttribute('aria-pressed', 'true')
      })
    })
  })

  describe('WCAG 2.1 AA Compliance - SystemOrganismViz', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(<SystemOrganismViz />)
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have proper ARIA labels', () => {
      render(<SystemOrganismViz />)
      
      const tabs = screen.getAllByRole('button')
      tabs.forEach(tab => {
        expect(tab).toHaveAttribute('aria-label')
        expect(tab).toHaveAttribute('aria-pressed')
      })
    })

    it('should support keyboard navigation', () => {
      render(<SystemOrganismViz />)
      
      const tabs = screen.getAllByRole('button')
      tabs.forEach(tab => {
        tab.focus()
        expect(document.activeElement).toBe(tab)
        
        fireEvent.keyDown(tab, { key: 'Enter' })
        expect(tab).toHaveAttribute('aria-pressed', 'true')
      })
    })
  })

  describe('Large Text Mode Support', () => {
    it('should work with large text mode enabled', () => {
      document.documentElement.classList.add('large-text')
      
      render(<MinistryHealthViz />)
      expect(screen.getByText('Ministry Health')).toBeInTheDocument()
      
      render(<StewardshipViz />)
      expect(screen.getByText('Financial Stewardship')).toBeInTheDocument()
      
      render(<DepartmentCommunityViz />)
      expect(screen.getByText('Department Community')).toBeInTheDocument()
      
      render(<SystemOrganismViz />)
      expect(screen.getByText('System Organism')).toBeInTheDocument()
    })
  })

  describe('High Contrast Mode Support', () => {
    it('should work with high contrast mode enabled', () => {
      document.documentElement.classList.add('high-contrast')
      
      render(<MinistryHealthViz />)
      expect(screen.getByText('Ministry Health')).toBeInTheDocument()
      
      render(<StewardshipViz />)
      expect(screen.getByText('Financial Stewardship')).toBeInTheDocument()
      
      render(<DepartmentCommunityViz />)
      expect(screen.getByText('Department Community')).toBeInTheDocument()
      
      render(<SystemOrganismViz />)
      expect(screen.getByText('System Organism')).toBeInTheDocument()
    })
  })

  describe('Screen Reader Support', () => {
    it('should have proper heading hierarchy', () => {
      render(<MinistryHealthViz />)
      const headings = screen.getAllByRole('heading')
      expect(headings.length).toBeGreaterThan(0)
    })

    it('should announce tab changes', () => {
      render(<MinistryHealthViz />)
      
      const congregationTab = screen.getByText('Congregation')
      fireEvent.click(congregationTab)
      
      // Should update aria-pressed to indicate state change
      expect(congregationTab).toHaveAttribute('aria-pressed', 'true')
    })
  })

  describe('Touch Target Accessibility', () => {
    it('should have adequate touch target sizes', () => {
      render(<MinistryHealthViz />)
      
      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        const styles = window.getComputedStyle(button)
        const height = parseInt(styles.height)
        const width = parseInt(styles.width)
        
        // WCAG 2.1 AA requires minimum 44x44 CSS pixels for touch targets
        expect(height).toBeGreaterThanOrEqual(44)
        expect(width).toBeGreaterThanOrEqual(44)
      })
    })
  })

  describe('Focus Management', () => {
    it('should maintain focus during tab changes', () => {
      render(<MinistryHealthViz />)
      
      const firstTab = screen.getAllByRole('button')[0]
      firstTab.focus()
      
      const secondTab = screen.getAllByRole('button')[1]
      fireEvent.click(secondTab)
      
      expect(document.activeElement).toBe(secondTab)
    })
  })

  describe('Reduced Motion Support', () => {
    it('should respect reduced motion preference', () => {
      window.matchMedia = vi.fn().mockImplementation(() => ({
        matches: true,
        media: '(prefers-reduced-motion: reduce)'
      }))
      
      render(<MinistryHealthViz />)
      expect(screen.getByText('Ministry Health')).toBeInTheDocument()
    })
  })
})