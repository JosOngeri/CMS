import { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from './AuthContext'

const PaletteContext = createContext()

export const usePalette = () => {
  const context = useContext(PaletteContext)
  if (!context) {
    throw new Error('usePalette must be used within a PaletteProvider')
  }
  return context
}

export const PaletteProvider = ({ children }) => {
  const { api } = useAuth()
  const [currentPalette, setCurrentPalette] = useState(null)
  const [palettes, setPalettes] = useState([])
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)

  useEffect(() => {
    fetchPalettes()
  }, [])

  const fetchPalettes = async () => {
    try {
      setLoading(true)
      console.log('Fetching palettes...')
      const response = await api.get('/palettes')
      console.log('Palettes response:', response.data)
      setPalettes(response.data.palettes || [])

      // Get current selected palette from settings
      const settingsResponse = await api.get('/settings')
      const appearanceSettings = settingsResponse.data.settings?.appearance || []
      const selectedPaletteSetting = appearanceSettings.find(s => s.key === 'selected_palette')
      const selectedPaletteName = selectedPaletteSetting?.value || 'church_blue'
      console.log('Selected palette name:', selectedPaletteName)

      const selectedPalette = response.data.palettes?.find(p => p.name === selectedPaletteName)
      console.log('Selected palette:', selectedPalette)
      if (selectedPalette) {
        setCurrentPalette(selectedPalette)
        applyPaletteToCSS(selectedPalette)
      }
    } catch (error) {
      console.error('Error fetching palettes:', error)
    } finally {
      setLoading(false)
    }
  }

  const applyPaletteToCSS = (palette) => {
    if (!palette || !palette.colors) return

    const root = document.documentElement
    const colors = palette.colors

    console.log('Applying palette to CSS:', palette.name, colors)

    // Apply colors as CSS variables
    Object.entries(colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value)
      console.log(`Set --color-${key} to ${value}`)
    })
  }

  const applyPalette = async (paletteId) => {
    try {
      console.log('Applying palette:', paletteId)
      await api.post(`/palettes/${paletteId}/apply`)
      
      const palette = palettes.find(p => p.id === paletteId)
      if (palette) {
        setCurrentPalette(palette)
        applyPaletteToCSS(palette)
      }
      
      return { success: true }
    } catch (error) {
      console.error('Error applying palette:', error)
      return { success: false, error: 'Failed to apply palette' }
    }
  }

  const toggleEditMode = () => {
    setEditMode(prev => !prev)
  }

  const value = {
    currentPalette,
    palettes,
    loading,
    editMode,
    setEditMode,
    toggleEditMode,
    applyPalette,
    refetchPalettes: fetchPalettes
  }

  return (
    <PaletteContext.Provider value={value}>
      {children}
    </PaletteContext.Provider>
  )
}
