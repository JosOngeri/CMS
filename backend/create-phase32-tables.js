const { pool } = require('./config/database');

async function createPhase32Tables() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('Creating Phase 3.2 database tables...');
    
    // Create comments table
    console.log('Creating comments table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        entity_type VARCHAR(50) NOT NULL,
        entity_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        type VARCHAR(20) DEFAULT 'comment',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP
      )
    `);
    
    // Create index for faster lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_comments_entity 
      ON comments(entity_type, entity_id)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_comments_user 
      ON comments(user_id)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_comments_created 
      ON comments(created_at DESC)
    `);
    
    // Create approval_history table
    console.log('Creating approval_history table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS approval_history (
        id SERIAL PRIMARY KEY,
        approval_id INTEGER NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        action VARCHAR(20) NOT NULL,
        comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create index for faster lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_approval_history_approval 
      ON approval_history(approval_id)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_approval_history_user 
      ON approval_history(user_id)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_approval_history_created 
      ON approval_history(created_at ASC)
    `);
    
    // Check if approval_requests table exists and has required columns
    console.log('Checking approval_requests table...');
    const approvalCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'approval_requests'
    `);
    
    const approvalColumns = approvalCheck.rows.map(row => row.column_name);
    
    // Add missing columns if they don't exist
    if (!approvalColumns.includes('requester_id')) {
      console.log('Adding requester_id column to approval_requests...');
      await client.query(`
        ALTER TABLE approval_requests 
        ADD COLUMN IF NOT EXISTS requester_id INTEGER REFERENCES users(id)
      `);
    }
    
    if (!approvalColumns.includes('delegated_to')) {
      console.log('Adding delegated_to column to approval_requests...');
      await client.query(`
        ALTER TABLE approval_requests 
        ADD COLUMN IF NOT EXISTS delegated_to INTEGER REFERENCES users(id)
      `);
    }
    
    if (!approvalColumns.includes('delegated_by')) {
      console.log('Adding delegated_by column to approval_requests...');
      await client.query(`
        ALTER TABLE approval_requests 
        ADD COLUMN IF NOT EXISTS delegated_by INTEGER REFERENCES users(id)
      `);
    }
    
    if (!approvalColumns.includes('delegated_at')) {
      console.log('Adding delegated_at column to approval_requests...');
      await client.query(`
        ALTER TABLE approval_requests 
        ADD COLUMN IF NOT EXISTS delegated_at TIMESTAMP
      `);
    }
    
    if (!approvalColumns.includes('priority')) {
      console.log('Adding priority column to approval_requests...');
      await client.query(`
        ALTER TABLE approval_requests 
        ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'medium'
      `);
    }
    
    if (!approvalColumns.includes('type')) {
      console.log('Adding type column to approval_requests...');
      await client.query(`
        ALTER TABLE approval_requests 
        ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'general'
      `);
    }
    
    // Create saved_reports table
    console.log('Creating saved_reports table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS saved_reports (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        data_source VARCHAR(50) NOT NULL,
        filters JSONB,
        columns JSONB,
        group_by VARCHAR(100),
        sort_by VARCHAR(100),
        format VARCHAR(20) DEFAULT 'json',
        is_public BOOLEAN DEFAULT false,
        created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create index for faster lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_saved_reports_user 
      ON saved_reports(created_by)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_saved_reports_public 
      ON saved_reports(is_public)
    `);
    
    // Create scheduled_reports table
    console.log('Creating scheduled_reports table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS scheduled_reports (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        schedule_config VARCHAR(100) NOT NULL,
        report_config JSONB NOT NULL,
        recipients JSONB,
        is_active BOOLEAN DEFAULT true,
        created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP
      )
    `);
    
    // Create index for faster lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_scheduled_reports_user 
      ON scheduled_reports(created_by)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_scheduled_reports_active 
      ON scheduled_reports(is_active)
    `);
    
    // Create report_executions table
    console.log('Creating report_executions table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS report_executions (
        id SERIAL PRIMARY KEY,
        report_id INTEGER NOT NULL REFERENCES scheduled_reports(id) ON DELETE CASCADE,
        filename VARCHAR(255),
        status VARCHAR(20) NOT NULL,
        error_message TEXT,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create index for faster lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_report_executions_report 
      ON report_executions(report_id)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_report_executions_status 
      ON report_executions(status)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_report_executions_executed 
      ON report_executions(executed_at DESC)
    `);
    
    // Create activity_log table
    console.log('Creating activity_log table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS activity_log (
        id SERIAL PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        entity_type VARCHAR(50),
        entity_id INTEGER,
        metadata JSONB,
        department_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create index for faster lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_activity_log_user 
      ON activity_log(user_id)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_activity_log_entity 
      ON activity_log(entity_type, entity_id)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_activity_log_department 
      ON activity_log(department_id)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_activity_log_created 
      ON activity_log(created_at DESC)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_activity_log_type 
      ON activity_log(type)
    `);
    
    // Create workflow_assignments table
    console.log('Creating workflow_assignments table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS workflow_assignments (
        id SERIAL PRIMARY KEY,
        approval_id INTEGER NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,
        step_index INTEGER NOT NULL,
        approver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'pending',
        comment TEXT,
        approved_at TIMESTAMP,
        delegated_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
        delegated_at TIMESTAMP,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create index for faster lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_workflow_assignments_approval 
      ON workflow_assignments(approval_id)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_workflow_assignments_approver 
      ON workflow_assignments(approver_id)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_workflow_assignments_step 
      ON workflow_assignments(step_index)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_workflow_assignments_status 
      ON workflow_assignments(status)
    `);
    
    // Create field_permissions table
    console.log('Creating field_permissions table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS field_permissions (
        id SERIAL PRIMARY KEY,
        role VARCHAR(50) NOT NULL,
        module VARCHAR(50) NOT NULL,
        field_name VARCHAR(100) NOT NULL,
        can_read BOOLEAN DEFAULT true,
        can_write BOOLEAN DEFAULT false,
        can_delete BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP,
        UNIQUE(role, module, field_name)
      )
    `);
    
    // Create index for faster lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_field_permissions_role 
      ON field_permissions(role)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_field_permissions_module 
      ON field_permissions(module)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_field_permissions_field 
      ON field_permissions(field_name)
    `);
    
    // Insert default field permissions for common modules
    console.log('Inserting default field permissions...');
    
    const defaultPermissions = [
      // Members module
      { role: 'Super Admin', module: 'members', field: 'id', read: true, write: true, delete: true },
      { role: 'Super Admin', module: 'members', field: 'first_name', read: true, write: true, delete: true },
      { role: 'Super Admin', module: 'members', field: 'last_name', read: true, write: true, delete: true },
      { role: 'Super Admin', module: 'members', field: 'email', read: true, write: true, delete: true },
      { role: 'Super Admin', module: 'members', field: 'phone', read: true, write: true, delete: true },
      { role: 'Super Admin', module: 'members', field: 'roles', read: true, write: true, delete: true },
      
      { role: 'Pastor', module: 'members', field: 'id', read: true, write: false, delete: false },
      { role: 'Pastor', module: 'members', field: 'first_name', read: true, write: true, delete: false },
      { role: 'Pastor', module: 'members', field: 'last_name', read: true, write: true, delete: false },
      { role: 'Pastor', module: 'members', field: 'email', read: true, write: false, delete: false },
      { role: 'Pastor', module: 'members', field: 'phone', read: true, write: true, delete: false },
      { role: 'Pastor', module: 'members', field: 'roles', read: true, write: false, delete: false },
      
      { role: 'Department Head', module: 'members', field: 'id', read: true, write: false, delete: false },
      { role: 'Department Head', module: 'members', field: 'first_name', read: true, write: true, delete: false },
      { role: 'Department Head', module: 'members', field: 'last_name', read: true, write: true, delete: false },
      { role: 'Department Head', module: 'members', field: 'email', read: true, write: false, delete: false },
      { role: 'Department Head', module: 'members', field: 'phone', read: true, write: true, delete: false },
      { role: 'Department Head', module: 'members', field: 'roles', read: true, write: false, delete: false },
      
      // Payments module
      { role: 'Super Admin', module: 'payments', field: 'id', read: true, write: true, delete: true },
      { role: 'Super Admin', module: 'payments', field: 'amount', read: true, write: true, delete: true },
      { role: 'Super Admin', module: 'payments', field: 'payment_date', read: true, write: true, delete: true },
      { role: 'Super Admin', module: 'payments', field: 'status', read: true, write: true, delete: true },
      
      { role: 'Treasurer', module: 'payments', field: 'id', read: true, write: true, delete: true },
      { role: 'Treasurer', module: 'payments', field: 'amount', read: true, write: true, delete: true },
      { role: 'Treasurer', module: 'payments', field: 'payment_date', read: true, write: true, delete: true },
      { role: 'Treasurer', module: 'payments', field: 'status', read: true, write: true, delete: true },
      
      { role: 'Pastor', module: 'payments', field: 'id', read: true, write: false, delete: false },
      { role: 'Pastor', module: 'payments', field: 'amount', read: true, write: false, delete: false },
      { role: 'Pastor', module: 'payments', field: 'payment_date', read: true, write: false, delete: false },
      { role: 'Pastor', module: 'payments', field: 'status', read: true, write: false, delete: false },
    ];
    
    for (const perm of defaultPermissions) {
      await client.query(
        `INSERT INTO field_permissions (role, module, field_name, can_read, can_write, can_delete)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (role, module, field_name) DO NOTHING`,
        [perm.role, perm.module, perm.field, perm.read, perm.write, perm.delete]
      );
    }
    
    await client.query('COMMIT');
    
    console.log('✅ Phase 3.2 database tables created successfully!');
    console.log('Tables created:');
    console.log('  - comments');
    console.log('  - approval_history');
    console.log('Columns added to approval_requests:');
    console.log('  - requester_id, delegated_to, delegated_by, delegated_at, priority, type');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating Phase 3.2 tables:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the migration
createPhase32Tables()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
