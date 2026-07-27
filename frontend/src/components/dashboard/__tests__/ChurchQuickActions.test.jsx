import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import ChurchQuickActions from '../ChurchQuickActions'

describe('ChurchQuickActions', () => {
  beforeEach(() => {
    // Mock React Router
    vi.mock('react-router-dom', () => ({
      Link: ({ children, to, ...props }) => <a href={to} {...props}>{children}</a>
    }))
  })

  it('renders default actions', () => {
    render(<ChurchQuickActions />)
    
    expect(screen.getByText('Quick Actions')).toBeInTheDocument()
    expect(screen.getByText('Make Payment')).toBeInTheDocument()
    expect(screen.getByText('New Announcement')).toBeInTheDocument()
  })

  it('renders pinned actions when provided', () => {
    render(<ChurchQuickActions pinnedActions={['payment', 'announcement']} />)
    
    expect(screen.getByText('Make Payment')).toBeInTheDocument()
    expect(screen.getByText('New Announcement')).toBeInTheDocument()
    expect(screen.queryByText('Create Event')).not.toBeInTheDocument()
  })

  it('groups actions by category', () => {
    render(<ChurchQuickActions />)
    
    // Should show category indicators
    expect(screen.getByText(/Stewardship/i)).toBeInTheDocument()
    expect(screen.getByText(/Communication/i)).toBeInTheDocument()
    expect(screen.getByText(/Community/i)).toBeInTheDocument()
  })

  it('has proper ARIA labels', () => {
    render(<ChurchQuickActions />)
    
    const paymentLink = screen.getByLabelText(/Make Payment.*Pay tithe and offerings/)
    expect(paymentLink).toBeInTheDocument()
  })

  it('is keyboard accessible', () => {
    render(<ChurchQuickActions />)
    
    const links = screen.getAllByRole('link')
    links.forEach(link => {
      expect(link).toHaveAttribute('aria-label')
    })
  })

  it('has touch-friendly targets', () => {
    render(<ChurchQuickActions />)
    
    const links = screen.getAllByRole('link')
    links.forEach(link => {
      const styles = window.getComputedStyle(link)
      // Should have minimum touch target size
      expect(parseInt(styles.minWidth) || parseInt(styles.paddingLeft) * 2).toBeGreaterThanOrEqual(44)
    })
  })

  it('supports large text mode', () => {
    document.documentElement.classList.add('large-text')
    
    render(<ChurchQuickActions />)
    
    expect(screen.getByText('Quick Actions')).toBeInTheDocument()
    
    document.documentElement.classList.remove('large-text')
  })

  it('supports high contrast mode', () => {
    document.documentElement.classList.add('high-contrast')
    
    render(<ChurchQuickActions />)
    
    expect(screen.getByText('Quick Actions')).toBeInTheDocument()
    
    document.documentElement.classList.remove('high-contrast')
  })
})