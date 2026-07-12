/**
 * Smart date-based grouping utility for gallery photos and events
 * Groups items into Apple Photos-style sections
 */

export const DATE_GROUPS = {
  TODAY: 'Today',
  YESTERDAY: 'Yesterday',
  LAST_7_DAYS: 'Last 7 Days',
  LAST_30_DAYS: 'Last 30 Days',
  THIS_YEAR: 'This Year',
  EARLIER: 'Earlier'
}

export const EVENT_DATE_GROUPS = {
  TODAY: 'Today',
  TOMORROW: 'Tomorrow',
  THIS_WEEK: 'This Week',
  NEXT_WEEK: 'Next Week',
  THIS_MONTH: 'This Month',
  NEXT_MONTH: 'Next Month',
  THIS_YEAR: 'This Year',
  FUTURE: 'Future',
  PAST: 'Past'
}

/**
 * Get relative date label for a photo
 * @param {Date|string} date - Photo date
 * @returns {string} Group label
 */
export const getDateGroup = (date) => {
  if (!date) return DATE_GROUPS.EARLIER

  const photoDate = new Date(date)
  const now = new Date()

  // Reset hours for accurate day comparison
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const photoDay = new Date(photoDate.getFullYear(), photoDate.getMonth(), photoDate.getDate())

  const diffTime = today - photoDay
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  // Today
  if (diffDays === 0) return DATE_GROUPS.TODAY

  // Yesterday
  if (diffDays === 1) return DATE_GROUPS.YESTERDAY

  // Last 7 days (excluding today/yesterday)
  if (diffDays >= 2 && diffDays <= 6) return DATE_GROUPS.LAST_7_DAYS

  // Last 30 days
  if (diffDays >= 7 && diffDays <= 29) return DATE_GROUPS.LAST_30_DAYS

  // This year
  if (photoDate.getFullYear() === now.getFullYear()) {
    return DATE_GROUPS.THIS_YEAR
  }

  // Earlier (previous years)
  return DATE_GROUPS.EARLIER
}

/**
 * Get relative date label for events (past and future)
 * @param {Date|string} date - Event date
 * @returns {string} Group label
 */
export const getEventDateGroup = (date) => {
  if (!date) return EVENT_DATE_GROUPS.PAST

  const eventDate = new Date(date)
  const now = new Date()

  // Reset hours for accurate day comparison
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const eventDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate())

  const diffTime = eventDay - today
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  // Today
  if (diffDays === 0) return EVENT_DATE_GROUPS.TODAY

  // Tomorrow
  if (diffDays === 1) return EVENT_DATE_GROUPS.TOMORROW

  // This week (next 6 days)
  if (diffDays >= 2 && diffDays <= 6) return EVENT_DATE_GROUPS.THIS_WEEK

  // Next week (7-13 days)
  if (diffDays >= 7 && diffDays <= 13) return EVENT_DATE_GROUPS.NEXT_WEEK

  // This month (14-30 days)
  if (diffDays >= 14 && diffDays <= 30) return EVENT_DATE_GROUPS.THIS_MONTH

  // Next month (31-60 days)
  if (diffDays >= 31 && diffDays <= 60) return EVENT_DATE_GROUPS.NEXT_MONTH

  // This year (rest of the year)
  if (eventDate.getFullYear() === now.getFullYear()) {
    return EVENT_DATE_GROUPS.THIS_YEAR
  }

  // Future years
  if (diffDays > 0) return EVENT_DATE_GROUPS.FUTURE

  // Past events
  return EVENT_DATE_GROUPS.PAST
}

/**
 * Format a date for display in section headers
 * @param {Date|string} date - Photo date
 * @param {string} group - Group label
 * @returns {string} Formatted date string
 */
export const formatDateHeader = (date, group) => {
  if (!date) return ''

  const photoDate = new Date(date)
  const now = new Date()

  switch (group) {
    case DATE_GROUPS.TODAY:
      return photoDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })

    case DATE_GROUPS.YESTERDAY:
      return 'Yesterday'

    case DATE_GROUPS.LAST_7_DAYS:
      return photoDate.toLocaleDateString('en-US', {
        weekday: 'long'
      })

    case DATE_GROUPS.LAST_30_DAYS:
      return photoDate.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      })

    case DATE_GROUPS.THIS_YEAR:
      return photoDate.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric'
      })

    case DATE_GROUPS.EARLIER:
    default:
      // Group by month and year
      return photoDate.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric'
      })
  }
}

/**
 * Format event date for display in section headers
 * @param {Date|string} date - Event date
 * @param {string} group - Group label
 * @returns {string} Formatted date string
 */
export const formatEventDateHeader = (date, group) => {
  if (!date) return ''

  const eventDate = new Date(date)
  const now = new Date()

  switch (group) {
    case EVENT_DATE_GROUPS.TODAY:
      return eventDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })

    case EVENT_DATE_GROUPS.TOMORROW:
      return 'Tomorrow'

    case EVENT_DATE_GROUPS.THIS_WEEK:
      return eventDate.toLocaleDateString('en-US', {
        weekday: 'long'
      })

    case EVENT_DATE_GROUPS.NEXT_WEEK:
      return eventDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric'
      })

    case EVENT_DATE_GROUPS.THIS_MONTH:
      return eventDate.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric'
      })

    case EVENT_DATE_GROUPS.NEXT_MONTH:
      return eventDate.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric'
      })

    case EVENT_DATE_GROUPS.THIS_YEAR:
      return eventDate.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric'
      })

    case EVENT_DATE_GROUPS.FUTURE:
      return eventDate.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric'
      })

    case EVENT_DATE_GROUPS.PAST:
    default:
      // Group by month and year for past events
      return eventDate.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric'
      })
  }
}

/**
 * Group photos by smart date categories
 * @param {Array} photos - Array of photo objects
 * @returns {Array} Grouped photos with headers
 */
export const groupPhotosByDate = (photos) => {
  if (!photos || photos.length === 0) return []

  // Sort photos by date (newest first)
  const sortedPhotos = [...photos].sort((a, b) => {
    const dateA = new Date(a.uploaded_at || a.created_at || a.date)
    const dateB = new Date(b.uploaded_at || b.created_at || b.date)
    return dateB - dateA
  })

  // Group by date category
  const groups = {}

  sortedPhotos.forEach(photo => {
    const group = getDateGroup(photo.uploaded_at || photo.created_at || photo.date)
    if (!groups[group]) {
      groups[group] = []
    }
    groups[group].push(photo)
  })

  // Convert to array with proper ordering
  const groupOrder = [
    DATE_GROUPS.TODAY,
    DATE_GROUPS.YESTERDAY,
    DATE_GROUPS.LAST_7_DAYS,
    DATE_GROUPS.LAST_30_DAYS,
    DATE_GROUPS.THIS_YEAR,
    DATE_GROUPS.EARLIER
  ]

  const result = []

  groupOrder.forEach(groupName => {
    if (groups[groupName] && groups[groupName].length > 0) {
      // For 'Earlier' group, further subdivide by month/year
      if (groupName === DATE_GROUPS.EARLIER) {
        const monthGroups = {}

        groups[groupName].forEach(photo => {
          const date = new Date(photo.uploaded_at || photo.created_at || photo.date)
          const monthYear = date.toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric'
          })

          if (!monthGroups[monthYear]) {
            monthGroups[monthYear] = []
          }
          monthGroups[monthYear].push(photo)
        })

        // Add each month group
        Object.entries(monthGroups)
          .sort(([a], [b]) => new Date(b) - new Date(a))
          .forEach(([monthYear, photos]) => {
            result.push({
              type: 'header',
              title: monthYear,
              count: photos.length,
              date: photos[0].uploaded_at || photos[0].created_at || photos[0].date
            })
            photos.forEach(photo => {
              result.push({
                type: 'photo',
                data: photo
              })
            })
          })
      } else {
        // Add group header
        result.push({
          type: 'header',
          title: groupName,
          count: groups[groupName].length,
          date: groups[groupName][0].uploaded_at || groups[groupName][0].created_at || groups[groupName][0].date
        })

        // Add photos
        groups[groupName].forEach(photo => {
          result.push({
            type: 'photo',
            data: photo
          })
        })
      }
    }
  })

  return result
}

/**
 * Group events by smart date categories (past and future)
 * @param {Array} events - Array of event objects
 * @returns {Array} Grouped events with headers
 */
export const groupEventsByDate = (events) => {
  if (!events || events.length === 0) return []

  // Sort events by date (upcoming first, then past)
  const now = new Date()
  const sortedEvents = [...events].sort((a, b) => {
    const dateA = new Date(a.date + ' ' + (a.time || '00:00'))
    const dateB = new Date(b.date + ' ' + (b.time || '00:00'))

    // Put upcoming events first, then past events
    const aIsFuture = dateA >= now
    const bIsFuture = dateB >= now

    if (aIsFuture && !bIsFuture) return -1
    if (!aIsFuture && bIsFuture) return 1

    // Within same category, sort by date
    return aIsFuture ? dateA - dateB : dateB - dateA
  })

  // Group by date category
  const groups = {}

  sortedEvents.forEach(event => {
    const group = getEventDateGroup(event.date)
    if (!groups[group]) {
      groups[group] = []
    }
    groups[group].push(event)
  })

  // Convert to array with proper ordering (upcoming first, then past)
  const groupOrder = [
    EVENT_DATE_GROUPS.TODAY,
    EVENT_DATE_GROUPS.TOMORROW,
    EVENT_DATE_GROUPS.THIS_WEEK,
    EVENT_DATE_GROUPS.NEXT_WEEK,
    EVENT_DATE_GROUPS.THIS_MONTH,
    EVENT_DATE_GROUPS.NEXT_MONTH,
    EVENT_DATE_GROUPS.THIS_YEAR,
    EVENT_DATE_GROUPS.FUTURE,
    EVENT_DATE_GROUPS.PAST
  ]

  const result = []

  groupOrder.forEach(groupName => {
    if (groups[groupName] && groups[groupName].length > 0) {
      // For 'Past' and 'Future' groups, further subdivide by month/year
      if (groupName === EVENT_DATE_GROUPS.PAST || groupName === EVENT_DATE_GROUPS.FUTURE) {
        const monthGroups = {}

        groups[groupName].forEach(event => {
          const date = new Date(event.date)
          const monthYear = date.toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric'
          })

          if (!monthGroups[monthYear]) {
            monthGroups[monthYear] = []
          }
          monthGroups[monthYear].push(event)
        })

        // Add each month group (newest first for past, oldest first for future)
        Object.entries(monthGroups)
          .sort(([a], [b]) => {
            const dateA = new Date(a)
            const dateB = new Date(b)
            return groupName === EVENT_DATE_GROUPS.PAST ? dateB - dateA : dateA - dateB
          })
          .forEach(([monthYear, events]) => {
            result.push({
              type: 'header',
              title: monthYear,
              count: events.length,
              date: events[0].date
            })
            events.forEach(event => {
              result.push({
                type: 'event',
                data: event
              })
            })
          })
      } else {
        // Add group header
        result.push({
          type: 'header',
          title: groupName,
          count: groups[groupName].length,
          date: groups[groupName][0].date
        })

        // Add events
        groups[groupName].forEach(event => {
          result.push({
            type: 'event',
            data: event
          })
        })
      }
    }
  })

  return result
}

/**
 * Get photos from specific time period
 * @param {Array} photos - Array of photo objects
 * @param {string} period - Period name (today, yesterday, week, month)
 * @returns {Array} Filtered photos
 */
export const getPhotosByPeriod = (photos, period) => {
  if (!photos) return []

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  return photos.filter(photo => {
    const photoDate = new Date(photo.uploaded_at || photo.created_at || photo.date)
    const photoDay = new Date(photoDate.getFullYear(), photoDate.getMonth(), photoDate.getDate())
    const diffDays = Math.floor((today - photoDay) / (1000 * 60 * 60 * 24))

    switch (period) {
      case 'today':
        return diffDays === 0
      case 'yesterday':
        return diffDays === 1
      case 'week':
        return diffDays >= 0 && diffDays <= 6
      case 'month':
        return diffDays >= 0 && diffDays <= 29
      default:
        return true
    }
  })
}

/**
 * Get events from specific time period
 * @param {Array} events - Array of event objects
 * @param {string} period - Period name (today, tomorrow, week, month, year)
 * @returns {Array} Filtered events
 */
export const getEventsByPeriod = (events, period) => {
  if (!events) return []

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  return events.filter(event => {
    const eventDate = new Date(event.date + ' ' + (event.time || '00:00'))
    const eventDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate())
    const diffDays = Math.floor((eventDay - today) / (1000 * 60 * 60 * 24))

    switch (period) {
      case 'today':
        return diffDays === 0
      case 'tomorrow':
        return diffDays === 1
      case 'week':
        return diffDays >= 0 && diffDays <= 6
      case 'month':
        return diffDays >= 0 && diffDays <= 29
      case 'year':
        return eventDate.getFullYear() === now.getFullYear()
      default:
        return true
    }
  })
}

/**
 * Create infinite loop of events for yearly plans
 * @param {Array} events - Array of event objects
 * @param {number} repeatCount - Number of times to repeat the cycle
 * @returns {Array} Events with adjusted dates for infinite loop
 */
export const createInfiniteEventLoop = (events, repeatCount = 3) => {
  if (!events || events.length === 0) return []

  const infiniteEvents = []
  const now = new Date()

  // Sort events by date
  const sortedEvents = [...events].sort((a, b) => {
    const dateA = new Date(a.date + ' ' + (a.time || '00:00'))
    const dateB = new Date(b.date + ' ' + (b.time || '00:00'))
    return dateA - dateB
  })

  // Get the first and last event dates
  const firstEventDate = new Date(sortedEvents[0].date)
  const lastEventDate = new Date(sortedEvents[sortedEvents.length - 1].date)

  // Calculate the year span
  const yearSpan = lastEventDate.getFullYear() - firstEventDate.getFullYear()

  // Create repeated cycles
  for (let cycle = 0; cycle < repeatCount; cycle++) {
    const yearOffset = cycle * (yearSpan + 1)

    sortedEvents.forEach(event => {
      const originalDate = new Date(event.date)
      const newDate = new Date(originalDate)
      newDate.setFullYear(originalDate.getFullYear() + yearOffset)

      // Only add events that are in the future or recent past
      const daysDiff = Math.floor((newDate - now) / (1000 * 60 * 60 * 24))

      if (daysDiff >= -30) { // Include events from last 30 days
        infiniteEvents.push({
          ...event,
          id: `${event.id}_cycle_${cycle}`,
          date: newDate.toISOString().split('T')[0],
          isRepeated: cycle > 0,
          cycleNumber: cycle
        })
      }
    })
  }

  // Sort the infinite events by date
  return infiniteEvents.sort((a, b) => {
    const dateA = new Date(a.date + ' ' + (a.time || '00:00'))
    const dateB = new Date(b.date + ' ' + (b.time || '00:00'))
    return dateA - dateB
  })
}

export default {
  DATE_GROUPS,
  EVENT_DATE_GROUPS,
  getDateGroup,
  getEventDateGroup,
  formatDateHeader,
  formatEventDateHeader,
  groupPhotosByDate,
  groupEventsByDate,
  getPhotosByPeriod,
  getEventsByPeriod,
  createInfiniteEventLoop
}
