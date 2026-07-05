import { useState, useEffect, useRef } from 'react'

const SettingsTabs = ({ tabs, activeTab, onTabChange, persistKey = 'settings-active-tab' }) => {
  const tabListRef = useRef(null)
  const [focusedIndex, setFocusedIndex] = useState(0)

  // Load saved tab from localStorage on mount
  useEffect(() => {
    const savedTab = localStorage.getItem(persistKey)
    if (savedTab && tabs.some(tab => tab.id === savedTab)) {
      onTabChange(savedTab)
      const index = tabs.findIndex(tab => tab.id === savedTab)
      setFocusedIndex(index)
    }
  }, [persistKey, onTabChange, tabs])

  // Save tab to localStorage when it changes
  const handleTabClick = (tabId, index) => {
    onTabChange(tabId)
    setFocusedIndex(index)
    localStorage.setItem(persistKey, tabId)
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

  return (
    <div className="border-b border-[var(--color-border)] border-[var(--color-border)]">
      <nav 
        ref={tabListRef}
        className="flex space-x-8 overflow-x-auto" 
        role="tablist"
        aria-label="Settings tabs"
      >
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            id={`${tab.id}-tab`}
            onClick={() => handleTabClick(tab.id, index)}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`${tab.id}-panel`}
            tabIndex={activeTab === tab.id ? 0 : -1}
            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'border-primary-500 text-primary-600 text-primary-400'
                : 'border-transparent text-[var(--color-textSecondary)] text-[var(--color-textSecondary)] hover:text-[var(--color-text)] hover:text-[var(--color-textSecondary)]'
            }`}
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
          </button>
        ))}
      </nav>
    </div>
  )
}

export default SettingsTabs
