-- Migration 059: departments.head_id
-- DashboardRepository.getDepartmentsHeadedBy resolves department headship via
-- departments.head_id, but the column only exists in the alternate schema files
-- (database/schema.sql, database/complete_schema.sql) — never in this canonical
-- migrations path. DBs built from backend/migrations/ raised
-- "column departments.head_id does not exist" → 500 on the dept dashboard.
ALTER TABLE departments ADD COLUMN IF NOT EXISTS head_id UUID REFERENCES users(id);
CREATE INDEX IF NOT EXISTS idx_departments_head_id ON departments(head_id);
