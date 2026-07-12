-- Phase 8: Migrate Existing Departments to Feature Allocations
-- Backfill feature settings for existing departments based on department type

-- Get all existing departments and allocate appropriate features
-- This is a one-time migration to ensure backward compatibility

-- Allocate core features to all departments
INSERT INTO department_feature_settings (department_id, feature_id, is_enabled, config, church_id)
SELECT 
    d.id as department_id,
    df.id as feature_id,
    true as is_enabled,
    '{}'::jsonb as config,
    d.church_id
FROM departments d
CROSS JOIN department_features df
WHERE df.slug IN ('MEMBERSHIP_MANAGEMENT', 'ATTENDANCE_TRACKING')
AND NOT EXISTS (
    SELECT 1 FROM department_feature_settings dfs 
    WHERE dfs.department_id = d.id AND dfs.feature_id = df.id
);

-- Allocate communication features to departments that typically need them
INSERT INTO department_feature_settings (department_id, feature_id, is_enabled, config, church_id)
SELECT 
    d.id as department_id,
    df.id as feature_id,
    true as is_enabled,
    '{}'::jsonb as config,
    d.church_id
FROM departments d
CROSS JOIN department_features df
WHERE df.slug IN ('SMS_NOTIFICATIONS', 'DOCUMENT_MANAGEMENT')
AND (
    d.name ILIKE '%communication%' OR 
    d.name ILIKE '%admin%' OR 
    d.name ILIKE '%secretary%'
)
AND NOT EXISTS (
    SELECT 1 FROM department_feature_settings dfs 
    WHERE dfs.department_id = d.id AND dfs.feature_id = df.id
);

-- Allocate financial features to treasury/finance departments
INSERT INTO department_feature_settings (department_id, feature_id, is_enabled, config, church_id)
SELECT 
    d.id as department_id,
    df.id as feature_id,
    true as is_enabled,
    '{}'::jsonb as config,
    d.church_id
FROM departments d
CROSS JOIN department_features df
WHERE df.slug IN ('FINANCIAL_TRACKING', 'REPORT_GENERATION')
AND (
    d.name ILIKE '%treasury%' OR 
    d.name ILIKE '%finance%'
)
AND NOT EXISTS (
    SELECT 1 FROM department_feature_settings dfs 
    WHERE dfs.department_id = d.id AND dfs.feature_id = df.id
);

-- Allocate event features to relevant departments
INSERT INTO department_feature_settings (department_id, feature_id, is_enabled, config, church_id)
SELECT 
    d.id as department_id,
    df.id as feature_id,
    true as is_enabled,
    '{}'::jsonb as config,
    d.church_id
FROM departments d
CROSS JOIN department_features df
WHERE df.slug = 'EVENT_LOGISTICS'
AND (
    d.name ILIKE '%event%' OR 
    d.name ILIKE '%activity%'
)
AND NOT EXISTS (
    SELECT 1 FROM department_feature_settings dfs 
    WHERE dfs.department_id = d.id AND dfs.feature_id = df.id
);

-- Allocate pastoral features to relevant departments
INSERT INTO department_feature_settings (department_id, feature_id, is_enabled, config, church_id)
SELECT 
    d.id as department_id,
    df.id as feature_id,
    true as is_enabled,
    '{}'::jsonb as config,
    d.church_id
FROM departments d
CROSS JOIN department_features df
WHERE df.slug = 'PRAYER_REQUESTS'
AND (
    d.name ILIKE '%pastor%' OR 
    d.name ILIKE '%elders%' OR
    d.name ILIKE '%personal%'
)
AND NOT EXISTS (
    SELECT 1 FROM department_feature_settings dfs 
    WHERE dfs.department_id = d.id AND dfs.feature_id = df.id
);

-- Ensure all departments have at least basic features
-- If a department has no features, give it core features
INSERT INTO department_feature_settings (department_id, feature_id, is_enabled, config, church_id)
SELECT 
    d.id as department_id,
    df.id as feature_id,
    true as is_enabled,
    '{}'::jsonb as config,
    d.church_id
FROM departments d
CROSS JOIN department_features df
WHERE df.slug = 'MEMBERSHIP_MANAGEMENT'
AND NOT EXISTS (
    SELECT 1 FROM department_feature_settings dfs 
    WHERE dfs.department_id = d.id
)
AND NOT EXISTS (
    SELECT 1 FROM department_feature_settings dfs 
    WHERE dfs.department_id = d.id AND dfs.feature_id = df.id
);
