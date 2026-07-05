import { useState, useEffect, useRef } from 'react'

const TabNavigation = ({ tabs, activeTab, onTabChange, persistKey = null, variant = 'default' }) => {
  const tabListRef = useRef(null)
  const [focusedIndex, setFocusedIndex] = useState(0)

  // Load saved tab from localStorage on mount if persistKey is provided
  useEffect(() => {
    if (persistKey) {
      const savedTab = localStorage.getItem(persistKey)
      if (savedTab && tabs.some(tab => tab.id === savedTab)) {
        onTabChange(savedTab)
        const index = tabs.findIndex(tab => tab.id === savedTab)
        setFocusedIndex(index)
      }
    }
  }, [persistKey, onTabChange, tabs])

  // Save tab to localStorage when it changes if persistKey is provided
  const handleTabClick = (tabId, index) => {
    onTabChange(tabId)
    setFocusedIndex(index)
    if (persistKey) {
      localStorage.setItem(persistKey, tabId)
    }
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!tabListRef.current) return

      const tabButtons = Array.from(tabListRef.current.querySelectorAll('[role="tab"]'))
      const currentIndex = tabButtons.findIndex(btn => btn === document.activeElement)

      if (currentIndex === -1) return

      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault()
          const prevIndex = currentIndex > 0 ? currentIndex - 1 : tabButtons.length - 1
          tabButtons[prevIndex].focus()
          setFocusedIndex(prevIndex)
          break
        case 'ArrowRight':
          event.preventDefault()
          const nextIndex = currentIndex < tabButtons.length - 1 ? currentIndex + 1 : 0
          tabButtons[nextIndex].focus()
          setFocusedIndex(nextIndex)
          break
        case 'Home':
          event.preventDefault()
          tabButtons[0].focus()
          setFocusedIndex(0)
          break
        case 'End':
          event.preventDefault()
          tabButtons[tabButtons.length - 1].focus()
          setFocusedIndex(tabButtons.length - 1)
          break
        case 'Enter':
        case ' ':
          event.preventDefault()
          const tabId = tabs[currentIndex]?.id
          if (tabId) {
            handleTabClick(tabId, currentIndex)
          }
          break
      }
    }

    const tabList = tabListRef.current
    if (tabList) {
      tabList.addEventListener('keydown', handleKeyDown)
      return () => {
        tabList.removeEventListener('keydown', handleKeyDown)
      }
    }
  }, [tabs, handleTabClick])

  const variantStyles = {
    default: 'border-b border-[var(--color-border)]',
    pills: 'bg-[var(--color-surface)] p-1 rounded-lg',
    underline: 'border-b-2 border-transparent'
  }

  const tabStyles = {
    default: (isActive) => `
      py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors
      ${isActive 
        ? 'border-primary-500 text-primary-600' 
        : 'border-transparent text-[var(--color-textSecondary)] hover:text-[var(--color-text)]'
      }
    `,
    pills: (isActive) => `
      px-4 py-2 rounded-md font-medium text-sm whitespace-nowrap transition-colors
      ${isActive 
        ? 'bg-[var(--color-surface)] text-primary-600 shadow' 
        : 'text-[var(--color-textSecondary)] hover:text-[var(--color-text)]'
      }
    `,
    underline: (isActive) => `
      py-2 px-4 font-medium text-sm whitespace-nowrap transition-colors border-b-2
      ${isActive 
        ? 'border-primary-500 text-primary-600' 
        : 'border-transparent text-[var(--color-textSecondary)] hover:text-[var(--color-text)]'
      }
    `
  }

  return (
    <div className={variantStyles[variant]}>
      <nav 
        ref={tabListRef}
        className="flex space-x-8 overflow-x-auto" 
        role="tablist"
        aria-label="Tab navigation"
      >
        {tabs.map((tab, index) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              id={`${tab.id}-tab`}
              onClick={() => handleTabClick(tab.id, index)}
              role="tab"
              aria-selected={isActive}
              aria-controls={`${tab.id}-panel`}
              tabIndex={isActive ? 0 : -1}
              className={tabStyles[variant](isActive)}
            >
              {tab.icon && <span className="inline-flex items-center gap-2">
                <tab.icon className="h-4 w-4" aria-hidden="true" />
                {tab.label}
              </span>}
              {!tab.icon && tab.label}
              {tab.badge && (
                <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-primary-100 text-primary-700 rounded-full">
                  {tab.badge}
                </span>
              )}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-[var(--color-surface)] text-[var(--color-textSecondary)] rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          )
        })}
      </nav>
    </div>
  )
}

export default TabNavigation
