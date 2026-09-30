-- Migration 036: Composite church_id indexes
-- Single-column church_id indexes exist, but the dominant query shape is
--   WHERE church_id = $ AND <predicate> [ORDER BY created_at DESC]
-- Composite indexes let Postgres satisfy both the tenant filter and the
-- sort/secondary predicate from one index scan.
--
-- Every index is created dynamically and only when the table AND all
-- listed columns exist, so this migration is safe across schema drift.

DO $$
DECLARE
  idx RECORD;
  idx_name TEXT;
  all_cols_exist BOOLEAN;
  col TEXT;
BEGIN
  FOR idx IN
    SELECT * FROM (VALUES
      -- High-traffic list endpoints: tenant filter + recency ordering
      ('payments',             'church_id, created_at DESC'),
      ('payments',             'church_id, status'),
      ('transactions',         'church_id, created_at DESC'),
      ('announcements',        'church_id, created_at DESC'),
      ('events',               'church_id, created_at DESC'),
      ('audit_log',            'church_id, created_at DESC'),
      -- Tenant + active-flag membership queries
      ('members',              'church_id, is_active'),
      ('users',                'church_id, is_active'),
      ('departments',          'church_id, is_active'),
      -- Obligations/reconciliations: tenant + entity/status lookups
      ('member_obligations',   'church_id, member_id'),
      ('member_obligations',   'church_id, status'),
      ('mpesa_reconciliations','church_id, status'),
      -- Per-user notification reads within a tenant
      ('notifications',        'church_id, user_id'),
      ('notifications',        'user_id, is_read'),
      -- SMS reporting snapshots: tenant + date window
      ('sms_daily_snapshots',  'church_id, snapshot_date')
    ) AS t(table_name, column_list)
  LOOP
    -- Confirm the table exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = idx.table_name
    ) THEN
      CONTINUE;
    END IF;

    -- Confirm every column in the list exists (strip sort direction)
    all_cols_exist := TRUE;
    FOR col IN SELECT trim(both ' ' FROM regexp_split_to_table(
                 regexp_replace(idx.column_list, '\s+(ASC|DESC)', '', 'g'), ','))
    LOOP
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = idx.table_name
          AND column_name = col
      ) THEN
        all_cols_exist := FALSE;
        EXIT;
      END IF;
    END LOOP;

    IF NOT all_cols_exist THEN
      CONTINUE;
    END IF;

    idx_name := 'idx_' || idx.table_name || '_' ||
                replace(regexp_replace(idx.column_list, '\s+(ASC|DESC)', '', 'g'), ', ', '_');

    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS %I ON %I(%s)',
      idx_name, idx.table_name, idx.column_list
    );
  END LOOP;
END $$;
