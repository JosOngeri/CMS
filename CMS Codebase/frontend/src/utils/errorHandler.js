/**
 * Error handling utilities for frontend
 */

/**
 * Handle API errors and return user-friendly messages
 */
export const handleApiError = (error) => {
  if (error.response) {
    // Server responded with error status
    const { status, data } = error.response

    switch (status) {
      case 400:
        return data?.error || 'Invalid request. Please check your input.'
      case 401:
        return 'Authentication required. Please log in again.'
      case 403:
        return 'You do not have permission to perform this action.'
      case 404:
        return 'The requested resource was not found.'
      case 429:
        return 'Too many requests. Please wait and try again.'
      case 500:
        return 'Server error. Please try again later.'
      default:
        return data?.error || data?.message || 'An error occurred. Please try again.'
    }
  } else if (error.request) {
    // Request made but no response received
    return 'Network error. Please check your connection and try again.'
  } else {
    // Error in request setup
    return error.message || 'An unexpected error occurred.'
  }
}

/**
 * Wrapper for API calls with error handling
 */
export const withErrorHandling = async (apiCall, toast) => {
  try {
    const response = await apiCall()
    return response
  } catch (error) {
    const errorMessage = handleApiError(error)
    toast.error(errorMessage)
    throw error
  }
}

/**
 * Safe fetch wrapper with error handling
 */
export const safeFetch = async (url, options = {}, toast) => {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = new Error(`HTTP error! status: ${response.status}`)
      error.response = { status: response.status, data: await response.json().catch(() => ({})) }
      throw error
    }

    return await response.json()
  } catch (error) {
    if (toast) {
      const errorMessage = handleApiError(error)
      toast.error(errorMessage)
    }
    throw error
  }
}

/**
 * Log error for debugging
 */
export const logError = (error, context = {}) => {
  console.error('Error:', {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
  })
}
