-- Create color_palettes table for storing color palettes
CREATE TABLE IF NOT EXISTS color_palettes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT false,
  is_default BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create color_palette_colors table for storing individual colors in each palette
CREATE TABLE IF NOT EXISTS color_palette_colors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  palette_id UUID REFERENCES color_palettes(id) ON DELETE CASCADE,
  color_key VARCHAR(50) NOT NULL,
  color_value VARCHAR(7) NOT NULL, -- Hex color
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(palette_id, color_key)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_color_palettes_name ON color_palettes(name);
CREATE INDEX IF NOT EXISTS idx_color_palettes_is_system ON color_palettes(is_system);
CREATE INDEX IF NOT EXISTS idx_color_palettes_created_by ON color_palettes(created_by);
CREATE INDEX IF NOT EXISTS idx_color_palette_colors_palette_id ON color_palette_colors(palette_id);
CREATE INDEX IF NOT EXISTS idx_color_palette_colors_color_key ON color_palette_colors(color_key);

-- Add comments
COMMENT ON TABLE color_palettes IS 'Stores color palettes for site theming';
COMMENT ON TABLE color_palette_colors IS 'Stores individual colors for each palette';
