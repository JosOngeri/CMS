-- Add logo and banner fields to departments table
ALTER TABLE departments 
ADD COLUMN IF NOT EXISTS logo_url VARCHAR(500),
ADD COLUMN IF NOT EXISTS banner_url VARCHAR(500),
ADD COLUMN IF NOT EXISTS logo_color VARCHAR(7) DEFAULT '#0088cc', -- Default WhatsApp-like blue
ADD COLUMN IF NOT EXISTS banner_color VARCHAR(7) DEFAULT '#075e54'; -- Default WhatsApp green

-- Add comments
COMMENT ON COLUMN departments.logo_url IS 'URL or file path for department logo image';
COMMENT ON COLUMN departments.banner_url IS 'URL or file path for department banner image';
COMMENT ON COLUMN departments.logo_color IS 'Brand color for logo accent (hex code)';
COMMENT ON COLUMN departments.banner_color IS 'Brand color for banner background (hex code)';
