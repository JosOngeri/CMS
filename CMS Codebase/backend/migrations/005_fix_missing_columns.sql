-- Fix missing columns in existing tables

-- Add 'used' column to refresh_tokens table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'refresh_tokens' AND column_name = 'used'
    ) THEN
        ALTER TABLE refresh_tokens ADD COLUMN used BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Add 'is_active' column to documents table if it doesn't exist
-- Note: This is now handled by 010_documents_schema.sql which creates the table with is_active
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'documents'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'documents' AND column_name = 'is_active'
    ) THEN
        ALTER TABLE documents ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
    END IF;
END $$;
