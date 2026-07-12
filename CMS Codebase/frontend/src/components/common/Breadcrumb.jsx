import { Link, useLocation } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'

const Breadcrumb = ({ items, maxItems = 4, homeLabel = 'Home', homeLink = '/' }) => {
  const location = useLocation()

  // If no items provided, generate from current path
  const breadcrumbItems = items || generateBreadcrumbsFromPath(location.pathname, homeLabel, homeLink)

  // Truncate if too many items
  const displayItems = truncateBreadcrumbs(breadcrumbItems, maxItems)

  return (
    <nav className="flex items-center space-x-2 text-sm" aria-label="Breadcrumb">
      {displayItems.map((item, index) => {
        const isLast = index === displayItems.length - 1
        const isFirst = index === 0

        return (
          <div key={index} className="flex items-center">
            {index > 0 && (
              <ChevronRight className="h-4 w-4 text-[var(--color-textSecondary)] mx-2 flex-shrink-0" aria-hidden="true" />
            )}
            
            {isFirst && item.icon && (
              <item.icon className="h-4 w-4 mr-1 text-[var(--color-textSecondary)]" aria-hidden="true" />
            )}
            
            {item.link && !isLast ? (
              <Link
                to={item.link}
                className="text-[var(--color-textSecondary)] hover:text-primary transition-colors truncate max-w-[200px]"
                aria-label={`Navigate to ${item.label}`}
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={`font-medium truncate max-w-[200px] ${
                  isLast
                    ? 'text-[var(--color-text)]'
                    : 'text-[var(--color-textSecondary)]'
                }`}
                aria-current={isLast ? 'page' : undefined}
              >
                {item.label}
              </span>
            )}
          </div>
        )
      })}
    </nav>
  )
}

// Generate breadcrumbs from current path
const generateBreadcrumbsFromPath = (pathname, homeLabel, homeLink) => {
  const items = [
    { label: homeLabel, link: homeLink, icon: Home }
  ]

  if (pathname === '/' || pathname === '') {
    return items
  }

  // Split path into segments
  const segments = pathname.split('/').filter(Boolean)
  
  // Build breadcrumb items
  let currentPath = ''
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`
    const isLast = index === segments.length - 1
    
    // Convert segment to readable label
    const label = formatSegment(segment)
    
    items.push({
      label,
      link: isLast ? undefined : currentPath
    })
  })

  return items
}

// Format URL segment to readable label
const formatSegment = (segment) => {
  // Handle IDs
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)) {
    return 'Details'
  }
  
  // Handle numeric IDs
  if (/^\d+$/.test(segment)) {
    return 'Details'
  }

  // Convert kebab-case to Title Case
  return segment
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

// Truncate breadcrumbs with ellipsis
const truncateBreadcrumbs = (items, maxItems) => {
  if (items.length <= maxItems) {
    return items
  }

  // Always show first (home) and last (current) items
  const first = items[0]
  const last = items[items.length - 1]
  const middleItems = items.slice(1, -1)
  
  // Show first 2 and last 2 items with ellipsis
  const keepCount = Math.floor((maxItems - 2) / 2)
  const startItems = middleItems.slice(0, keepCount)
  const endItems = middleItems.slice(-keepCount)

  return [
    first,
    ...startItems,
    { label: '...', link: undefined },
    ...endItems,
    last
  ]
}

export default Breadcrumb
