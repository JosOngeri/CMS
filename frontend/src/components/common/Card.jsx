import React from 'react'
import { useColorPalette } from '../../contexts/ColorPaletteContext'

const Card = ({ children, className = '' }) => {
  const { colors } = useColorPalette()

  return (
    <div
      className={`rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300 ${className}`}
      style={{
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderWidth: '1px',
        borderStyle: 'solid',
        color: colors.text
      }}
    >
      {children}
    </div>
  )
}

export default Card
