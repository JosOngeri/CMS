import { useState, useEffect } from 'react'

/**
 * MobileWrapper - Detects mobile devices and renders mobile-specific components
 */
const MobileWrapper = ({ children, mobileComponent }) => {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera
      const isMobileDevice = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent)
      const isSmallScreen = window.innerWidth <= 768
      setIsMobile(isMobileDevice || isSmallScreen)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  if (isMobile && mobileComponent) {
    return mobileComponent
  }

  return children
}

export default MobileWrapper