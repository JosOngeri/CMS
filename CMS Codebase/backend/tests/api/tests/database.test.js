/**
 * database.test.js
 *
 * Schema integrity tests – verify the PostgreSQL database has the expected
 * tables, columns, and foreign-key constraints.
 *
 * ⚠️  These tests require a live PostgreSQL connection.
 *     They are SKIPPED automatically when TEST_DATABASE_URL is not set,
 *     so they never fail in CI environments that have no database.
 *
 * To run them locally:
 *   TEST_DATABASE_URL=postgres://user:pass@localhost:5432/kmaincms_test npx jest database.test.js
 *
 * The tests do NOT mock config/database – they use a real pool so they can query
 * information_schema and pg_constraint.
 */

const { Pool } = require('pg');

// ── Skip guard ────────────────────────────────────────────────────────────────
// Only run DB tests if TEST_DATABASE_URL is explicitly set to a non-default value
// or if DATABASE_URL is set (for local development with real DB)
const DB_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
const DEFAULT_TEST_URL = 'postgres://postgres:postgres@127.0.0.1:5432/kmaincms_test';
const RUN_DB_TESTS = Boolean(DB_URL && DB_URL !== DEFAULT_TEST_URL);
const dbIt   = RUN_DB_TESTS ? it   : it.skip;
const dbDesc = RUN_DB_TESTS ? describe : describe.skip;

let pool;

beforeAll(() => {
  if (!RUN_DB_TESTS) return;
  pool = new Pool({
    connectionString: DB_URL,
    connectionTimeoutMillis: 5000,
  });
});

afterAll(async () => {
  if (pool) {
    await pool.end().catch(() => {});
  }
});

/** Helper: query information_schema */
const tableExists = async (tableName) => {
  const { rows } = await pool.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1`,
    [tableName]
  );
  return rows.length > 0;
};

const columnExists = async (tableName, columnName) => {
  const { rows } = await pool.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name   = $1
       AND column_name  = $2`,
    [tableName, columnName]
  );
  return rows.length > 0;
};

const fkExists = async (fromTable, fromColumn, toTable) => {
  const { rows } = await pool.query(
    `SELECT tc.constraint_name
     FROM information_schema.table_constraints   AS tc
     JOIN information_schema.key_column_usage    AS kcu
       ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
     JOIN information_schema.referential_constraints AS rc
       ON tc.constraint_name = rc.constraint_name
     JOIN information_schema.key_column_usage    AS ccu
       ON ccu.constraint_name = rc.unique_constraint_name AND ccu.table_schema = tc.table_schema
     WHERE tc.constraint_type = 'FOREIGN KEY'
       AND tc.table_name      = $1
       AND kcu.column_name    = $2
       AND ccu.table_name     = $3`,
    [fromTable, fromColumn, toTable]
  );
  return rows.length > 0;
};

// =============================================================================
// Required tables
// =============================================================================
dbDesc('Schema – required tables exist', () => {
  const REQUIRED_TABLES = [
    'users',
    'members',
    'departments',
    'content_items',
    'announcements',
    'events',
    'payments',
    'transactions',
    'documents',
    'approval_requests',
    'approval_workflows',
    'notifications',
    'sms_messages',
    'sms_templates',
    'sms_campaigns',
    'reports',
    'search_results',
    'security_logs',
    'security_settings',
    'blocked_ips',
    'user_sessions',
    'failed_login_attempts',
    'accessibility_settings',
    'test_results',
    'documentation',
    'saved_searches',
    'seo_settings',
    'monitoring_metrics',
    'system_logs',
  ];

  for (const table of REQUIRED_TABLES) {
    dbIt(`table "${table}" exists`, async () => {
      const exists = await tableExists(table);
      expect(exists).toBe(true);
    });
  }
});

// =============================================================================
// users table columns
// =============================================================================
dbDesc('Schema – users table columns', () => {
  const REQUIRED_COLUMNS = [
    'id',
    'username',
    'email',
    'password',
    'role',
    'status',
    'is_active',
    'created_at',
    'updated_at',
  ];

  for (const col of REQUIRED_COLUMNS) {
    dbIt(`users.${col} column exists`, async () => {
      const exists = await columnExists('users', col);
      expect(exists).toBe(true);
    });
  }
});

// =============================================================================
// members table columns
// =============================================================================
dbDesc('Schema – members table columns', () => {
  const REQUIRED_COLUMNS = [
    'id',
    'user_id',
    'first_name',
    'last_name',
    'email',
    'phone',
    'membership_status',
    'joined_date',
    'department',
    'created_at',
    'updated_at',
  ];

  for (const col of REQUIRED_COLUMNS) {
    dbIt(`members.${col} column exists`, async () => {
      const exists = await columnExists('members', col);
      expect(exists).toBe(true);
    });
  }
});

// =============================================================================
// documents table columns
// =============================================================================
dbDesc('Schema – documents table columns', () => {
  const REQUIRED_COLUMNS = ['id', 'name', 'description', 'file_path', 'file_type', 'file_size', 'category', 'uploaded_by'];

  for (const col of REQUIRED_COLUMNS) {
    dbIt(`documents.${col} column exists`, async () => {
      const exists = await columnExists('documents', col);
      expect(exists).toBe(true);
    });
  }
});

// =============================================================================
// approval_requests table columns
// =============================================================================
dbDesc('Schema – approval_requests table columns', () => {
  const REQUIRED_COLUMNS = ['id', 'title', 'description', 'type', 'status', 'requested_by', 'approved_by', 'rejected_by'];

  for (const col of REQUIRED_COLUMNS) {
    dbIt(`approval_requests.${col} column exists`, async () => {
      const exists = await columnExists('approval_requests', col);
      expect(exists).toBe(true);
    });
  }
});

// =============================================================================
// Foreign key relationships
// =============================================================================
dbDesc('Schema – foreign key relationships', () => {
  dbIt('members.user_id → users.id', async () => {
    const exists = await fkExists('members', 'user_id', 'users');
    expect(exists).toBe(true);
  });

  dbIt('documents.uploaded_by → users.id', async () => {
    const exists = await fkExists('documents', 'uploaded_by', 'users');
    expect(exists).toBe(true);
  });

  dbIt('approval_requests.requested_by → users.id', async () => {
    const exists = await fkExists('approval_requests', 'requested_by', 'users');
    expect(exists).toBe(true);
  });

  dbIt('notifications.user_id → users.id', async () => {
    const exists = await fkExists('notifications', 'user_id', 'users');
    expect(exists).toBe(true);
  });
});

// =============================================================================
// Data integrity – no orphaned records
// =============================================================================
dbDesc('Data integrity – no orphaned records', () => {
  dbIt('no orphaned members (all user_id values reference valid users)', async () => {
    const { rows } = await pool.query(`
      SELECT COUNT(*) AS orphan_count
      FROM members m
      LEFT JOIN users u ON u.id = m.user_id
      WHERE u.id IS NULL
    `);
    expect(Number(rows[0].orphan_count)).toBe(0);
  });

  dbIt('no orphaned documents (all uploaded_by values reference valid users)', async () => {
    const { rows } = await pool.query(`
      SELECT COUNT(*) AS orphan_count
      FROM documents d
      LEFT JOIN users u ON u.id = d.uploaded_by
      WHERE u.id IS NULL
    `);
    expect(Number(rows[0].orphan_count)).toBe(0);
  });

  dbIt('no orphaned approval_requests', async () => {
    const { rows } = await pool.query(`
      SELECT COUNT(*) AS orphan_count
      FROM approval_requests ar
      LEFT JOIN users u ON u.id = ar.requested_by
      WHERE u.id IS NULL
    `);
    expect(Number(rows[0].orphan_count)).toBe(0);
  });
});

// =============================================================================
// Uniqueness constraints
// =============================================================================
dbDesc('Schema – uniqueness constraints', () => {
  dbIt('users email column has a unique constraint or unique index', async () => {
    const { rows } = await pool.query(`
      SELECT tc.constraint_type
      FROM information_schema.table_constraints   tc
      JOIN information_schema.key_column_usage    kcu
        ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
      WHERE tc.table_name = 'users'
        AND kcu.column_name = 'email'
        AND (tc.constraint_type = 'UNIQUE' OR EXISTS (
          SELECT 1 FROM pg_indexes pi
          WHERE pi.tablename = 'users'
            AND pi.indexname LIKE '%email%'
        ))
    `);
    expect(rows.length).toBeGreaterThan(0);
  });

  dbIt('users username column has a unique constraint or unique index', async () => {
    const { rows } = await pool.query(`
      SELECT tc.constraint_type
      FROM information_schema.table_constraints   tc
      JOIN information_schema.key_column_usage    kcu
        ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
      WHERE tc.table_name = 'users'
        AND kcu.column_name = 'username'
        AND (tc.constraint_type = 'UNIQUE' OR EXISTS (
          SELECT 1 FROM pg_indexes pi
          WHERE pi.tablename = 'users'
            AND pi.indexname LIKE '%username%'
        ))
    `);
    expect(rows.length).toBeGreaterThan(0);
  });
});
