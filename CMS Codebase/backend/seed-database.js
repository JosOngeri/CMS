const { pool } = require('./config/database');
const bcrypt = require('bcryptjs');

async function seedDatabase() {
  try {
    console.log('Starting database seeding...');

    // Check if roles already exist, if so use their IDs
    let superAdminId, pastorId, elderId, deptHeadId, memberId;
    
    const existingRoles = await pool.query(`
      SELECT id, name FROM roles WHERE name IN ('Super Admin', 'Pastor', 'Elder', 'Department Head', 'Member')
    `);
    
    const roleMap = {};
    existingRoles.rows.forEach(role => {
      roleMap[role.name] = role.id;
    });
    
    superAdminId = roleMap['Super Admin'];
    pastorId = roleMap['Pastor'];
    elderId = roleMap['Elder'];
    deptHeadId = roleMap['Department Head'];
    memberId = roleMap['Member'];

    // Check if users already exist, if so use their IDs
    let adminUserId, pastorUserId, elderUserId, treasurerUserId, clerkUserId, memberUserId;
    
    const existingUsers = await pool.query(`
      SELECT id, username FROM users WHERE username IN ('admin', 'pastor', 'elder', 'treasurer', 'clerk', 'member')
    `);
    
    const userMap = {};
    existingUsers.rows.forEach(user => {
      userMap[user.username] = user.id;
    });
    
    adminUserId = userMap['admin'];
    pastorUserId = userMap['pastor'];
    elderUserId = userMap['elder'];
    treasurerUserId = userMap['treasurer'];
    clerkUserId = userMap['clerk'];
    memberUserId = userMap['member'];

    // Insert sample roles if they don't exist
    if (!superAdminId || !pastorId || !elderId || !deptHeadId || !memberId) {
      const roleResult = await pool.query(`
        INSERT INTO roles (name, description, created_at) VALUES
        ('Super Admin', 'Full system administration', NOW()),
        ('Pastor', 'Church pastor with full oversight', NOW()),
        ('Elder', 'Church elder with oversight responsibilities', NOW()),
        ('Department Head', 'Head of a church department', NOW()),
        ('Member', 'Regular church member', NOW())
        ON CONFLICT (name) DO NOTHING
        RETURNING id, name
      `);
      
      roleResult.rows.forEach(role => {
        roleMap[role.name] = role.id;
      });
      
      superAdminId = roleMap['Super Admin'];
      pastorId = roleMap['Pastor'];
      elderId = roleMap['Elder'];
      deptHeadId = roleMap['Department Head'];
      memberId = roleMap['Member'];
    }

    // Hash passwords
    const adminPassword = await bcrypt.hash('admin123', 10);
    const pastorPassword = await bcrypt.hash('pastor123', 10);
    const elderPassword = await bcrypt.hash('elder123', 10);
    const treasurerPassword = await bcrypt.hash('treasurer123', 10);
    const clerkPassword = await bcrypt.hash('clerk123', 10);
    const memberPassword = await bcrypt.hash('member123', 10);

    // Insert sample users if they don't exist
    if (!adminUserId || !pastorUserId || !elderUserId || !treasurerUserId || !clerkUserId || !memberUserId) {
      const userResult = await pool.query(`
        INSERT INTO users (first_name, last_name, username, email, phone_number, password_hash, is_active, created_at) VALUES
        ('Admin', 'User', 'admin', 'admin@sda.org', '+254700000000', $1, true, NOW()),
        ('Pastor', 'John', 'pastor', 'pastor@sda.org', '+254700000001', $2, true, NOW()),
        ('Elder', 'James', 'elder', 'elder@sda.org', '+254700000003', $3, true, NOW()),
        ('Treasurer', 'Mary', 'treasurer', 'treasurer@sda.org', '+254700000004', $4, true, NOW()),
        ('Church', 'Clerk', 'clerk', 'clerk@sda.org', '+254700000005', $5, true, NOW()),
        ('Church', 'Member', 'member', 'member@sda.org', '+254700000002', $6, true, NOW())
        ON CONFLICT (username) DO NOTHING
        RETURNING id, username
      `, [adminPassword, pastorPassword, elderPassword, treasurerPassword, clerkPassword, memberPassword]);
      
      userResult.rows.forEach(user => {
        userMap[user.username] = user.id;
      });
      
      adminUserId = userMap['admin'];
      pastorUserId = userMap['pastor'];
      elderUserId = userMap['elder'];
      treasurerUserId = userMap['treasurer'];
      clerkUserId = userMap['clerk'];
      memberUserId = userMap['member'];
    }

    // Insert user roles
    await pool.query(`
      INSERT INTO user_roles (user_id, role_id, assigned_at) VALUES
      ($1, $2, NOW()),
      ($3, $4, NOW()),
      ($5, $6, NOW()),
      ($7, $8, NOW()),
      ($9, $10, NOW()),
      ($11, $12, NOW())
      ON CONFLICT (user_id, role_id) DO NOTHING
    `, [adminUserId, superAdminId, pastorUserId, pastorId, elderUserId, elderId, treasurerUserId, deptHeadId, clerkUserId, deptHeadId, memberUserId, memberId]);

    // Insert sample departments
    await pool.query(`
      INSERT INTO departments (name, description, leader_name, leader_contact, created_at) VALUES
      ('Sabbath School', 'Bible study and spiritual education for all ages', 'Pastor John', '+254700000001', NOW()),
      ('Youth Ministry', 'Programs and activities for young adults', 'Admin User', '+254700000000', NOW()),
      ('Music Ministry', 'Choir and worship music coordination', 'Admin User', '+254700000000', NOW()),
      ('Community Outreach', 'Evangelism and community service programs', 'Pastor John', '+254700000001', NOW())
      ON CONFLICT (name) DO NOTHING
    `);

    // Get department IDs for memberships
    const deptResult = await pool.query(`
      SELECT id, name FROM departments WHERE name IN ('Sabbath School', 'Youth Ministry', 'Music Ministry', 'Community Outreach')
    `);
    
    const deptMap = {};
    deptResult.rows.forEach(dept => {
      deptMap[dept.name] = dept.id;
    });
    
    // Insert department memberships
    await pool.query(`
      INSERT INTO department_members (user_id, department_id, role, joined_at) VALUES
      ($1, $2, 'Superintendent', NOW()),
      ($3, $4, 'Director', NOW()),
      ($5, $6, 'Leader', NOW()),
      ($7, $8, 'Member', NOW())
      ON CONFLICT (user_id, department_id) DO NOTHING
    `, [pastorUserId, deptMap['Sabbath School'], pastorUserId, deptMap['Community Outreach'], adminUserId, deptMap['Youth Ministry'], memberUserId, deptMap['Sabbath School']]);

    console.log('Database seeded successfully!');
    console.log('Sample users created:');
    console.log('  Admin: admin / admin123');
    console.log('  Pastor: pastor / pastor123');
    console.log('  Elder: elder / elder123');
    console.log('  Treasurer: treasurer / treasurer123');
    console.log('  Church Clerk: clerk / clerk123');
    console.log('  Member: member / member123');

  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await pool.end();
  }
}

seedDatabase();
