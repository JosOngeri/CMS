const { pool } = require('./config/database');

async function checkUsers() {
  try {
    console.log('🔍 Checking database for created users...\n');
    
    // Get all users
    const usersQuery = `
      SELECT 
        u.id,
        u.username,
        u.email,
        u.first_name,
        u.last_name,
        u.is_active,
        u.created_at,
        array_agg(r.name) as roles
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      GROUP BY u.id, u.username, u.email, u.first_name, u.last_name, u.is_active, u.created_at
      ORDER BY u.created_at DESC
    `;
    
    const usersResult = await pool.query(usersQuery);
    
    if (usersResult.rows.length === 0) {
      console.log('❌ No users found in database');
      return;
    }
    
    console.log(`✅ Found ${usersResult.rows.length} users in database:\n`);
    
    usersResult.rows.forEach((user, index) => {
      console.log(`${index + 1}. ${user.username}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Name: ${user.first_name} ${user.last_name}`);
      console.log(`   Roles: ${user.roles.filter(r => r !== null).join(', ') || 'None'}`);
      console.log(`   Active: ${user.is_active ? 'Yes' : 'No'}`);
      console.log(`   Created: ${new Date(user.created_at).toLocaleDateString()}`);
      console.log('');
    });
    
    // Check department assignments
    console.log('🏢 Department Assignments:\n');
    
    const deptQuery = `
      SELECT 
        u.username,
        d.name as department_name,
        dm.role,
        dm.joined_at
      FROM users u
      JOIN department_members dm ON u.id = dm.user_id
      JOIN departments d ON dm.department_id = d.id
      ORDER BY d.name, dm.role, u.username
    `;
    
    const deptResult = await pool.query(deptQuery);
    
    if (deptResult.rows.length === 0) {
      console.log('❌ No department assignments found');
    } else {
      console.log(`✅ Found ${deptResult.rows.length} department assignments:\n`);
      
      const groupedByDept = deptResult.rows.reduce((groups, row) => {
        if (!groups[row.department_name]) {
          groups[row.department_name] = [];
        }
        groups[row.department_name].push(row);
        return groups;
      }, {});
      
      Object.entries(groupedByDept).forEach(([deptName, assignments]) => {
        console.log(`📋 ${deptName}:`);
        assignments.forEach(assignment => {
          console.log(`   • ${assignment.username} (${assignment.role})`);
        });
        console.log('');
      });
    }
    
    // Check test users specifically
    console.log('🔑 Test Users Status:\n');
    
    const testUsers = ['admin', 'pastor', 'member'];
    
    for (const testUser of testUsers) {
      const testQuery = `
        SELECT username, email, is_active, created_at
        FROM users 
        WHERE username = $1
      `;
      
      const testResult = await pool.query(testQuery, [testUser]);
      
      if (testResult.rows.length > 0) {
        const user = testResult.rows[0];
        console.log(`✅ ${testUser}: ${user.email} | Active: ${user.is_active ? 'Yes' : 'No'}`);
      } else {
        console.log(`❌ ${testUser}: Not found`);
      }
    }
    
    console.log('\n📊 Database Summary:');
    console.log(`• Total Users: ${usersResult.rows.length}`);
    console.log(`• Department Assignments: ${deptResult.rows.length}`);
    console.log(`• Active Users: ${usersResult.rows.filter(u => u.is_active).length}`);
    
  } catch (error) {
    console.error('❌ Error checking users:', error.message);
  } finally {
    await pool.end();
  }
}

checkUsers();
