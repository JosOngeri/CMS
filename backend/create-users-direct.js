const bcrypt = require('bcryptjs');
const { pool } = require('./config/database');

// Direct user creation based on the workers list we already read
const departmentMembers = [
  // ELDERS
  { name: 'George Ng\'ang\'a', department: 'Elders', role: 'Leader' },
  { name: 'John Monda', department: 'Elders', role: 'Assistant' },
  { name: 'Paul Karongo', department: 'Elders', role: 'Member' },
  { name: 'George Onchogo', department: 'Elders', role: 'Member' },
  { name: 'Stephen Ng\'ang\'a', department: 'Elders', role: 'Member' },
  { name: 'Moses Khamala', department: 'Elders', role: 'Member' },
  { name: 'Thomas Gichinga', department: 'Elders', role: 'Member' },
  { name: 'Elijah Mokua', department: 'Elders', role: 'Member' },
  { name: 'Leonard Gitonga', department: 'Elders', role: 'Member' },
  { name: 'Stephen Onyancha', department: 'Elders', role: 'Member' },
  { name: 'Joash Mogesa', department: 'Elders', role: 'Member' },
  { name: 'Robert Ruuge', department: 'Elders', role: 'Member' },
  { name: 'Samuel Onchari', department: 'Elders', role: 'Member' },
  { name: 'Samson Omae', department: 'Elders', role: 'Member' },
  { name: 'Jeremiah Kuraru', department: 'Elders', role: 'Member' },
  { name: 'Martin Amalemba', department: 'Elders', role: 'Member' },
  { name: 'Edward Ongeri', department: 'Elders', role: 'Member' },
  { name: 'Fredrick Wachira', department: 'Elders', role: 'Member' },
  { name: 'Henry Mokaya', department: 'Elders', role: 'Member' },
  
  // DEACONS
  { name: 'Kennedy Mbatia', department: 'Deaconry', role: 'Leader' },
  { name: 'Joseph Auka', department: 'Deaconry', role: 'Assistant' },
  { name: 'Tom Mboya', department: 'Deaconry', role: 'Member' },
  { name: 'Joel Maoro', department: 'Deaconry', role: 'Member' },
  { name: 'Geoffrey Karimi', department: 'Deaconry', role: 'Member' },
  { name: 'James Ogato', department: 'Deaconry', role: 'Member' },
  { name: 'Jones Momanyi', department: 'Deaconry', role: 'Member' },
  { name: 'Arnold Mayaka', department: 'Deaconry', role: 'Member' },
  { name: 'Francis Ng\'ang\'a Matheri', department: 'Deaconry', role: 'Member' },
  { name: 'George Muyaki', department: 'Deaconry', role: 'Member' },
  { name: 'Juvenalis Wandera', department: 'Deaconry', role: 'Member' },
  { name: 'Samuel Kinywa', department: 'Deaconry', role: 'Member' },
  { name: 'Daniel Nyaribo', department: 'Deaconry', role: 'Member' },
  { name: 'Peter Ndipau', department: 'Deaconry', role: 'Member' },
  { name: 'Kevin Sane', department: 'Deaconry', role: 'Member' },
  { name: 'Brian Mulongo', department: 'Deaconry', role: 'Member' },
  { name: 'Kennedy Mwambi Oganda', department: 'Deaconry', role: 'Member' },
  
  // DEACONESSES
  { name: 'Zipporah Isaiah', department: 'Deaconry', role: 'Leader' },
  { name: 'Mercy Achoki', department: 'Deaconry', role: 'Assistant' },
  { name: 'Jane Kiongo', department: 'Deaconry', role: 'Member' },
  { name: 'Rosemary Gachege', department: 'Deaconry', role: 'Member' },
  { name: 'Esther Bosibori', department: 'Deaconry', role: 'Member' },
  { name: 'Veronicah Ndungu', department: 'Deaconry', role: 'Member' },
  { name: 'Evalyn Mokaya', department: 'Deaconry', role: 'Member' },
  { name: 'Bancy Njogu', department: 'Deaconry', role: 'Member' },
  { name: 'Elizabeth Mutune', department: 'Deaconry', role: 'Member' },
  { name: 'Monicah Wamuyu', department: 'Deaconry', role: 'Member' },
  { name: 'Leonidah Mboi', department: 'Deaconry', role: 'Member' },
  { name: 'Irene Nyakige', department: 'Deaconry', role: 'Member' },
  { name: 'Mary Ndipau', department: 'Deaconry', role: 'Member' },
  { name: 'Redemptah Nzilani', department: 'Deaconry', role: 'Member' },
  { name: 'Evalyne Moraa Omwenga', department: 'Deaconry', role: 'Member' },
  { name: 'Mintlet Amalemba', department: 'Deaconry', role: 'Member' },
  { name: 'Damaris Kwamboka', department: 'Deaconry', role: 'Member' },
  { name: 'Alice Onchari', department: 'Deaconry', role: 'Member' },
  
  // TREASURER
  { name: 'Elizabeth Mboya', department: 'Treasurer', role: 'Leader' },
  { name: 'Isaac Chabari', department: 'Treasurer', role: 'Assistant' },
  { name: 'Brian Mboga', department: 'Treasurer', role: 'Assistant' },
  { name: 'Ambrose Mbugua', department: 'Treasurer', role: 'Assistant' },
  { name: 'Lucy Caleb', department: 'Treasurer', role: 'Assistant' },
  { name: 'Lucy Wanjiru', department: 'Treasurer', role: 'Assistant' },
  { name: 'Lilian Kawira', department: 'Treasurer', role: 'Assistant' },
  
  // CHURCH CLERK
  { name: 'Esther Okemwa', department: 'Church Clerk', role: 'Leader' },
  { name: 'Joshua Nyakundi', department: 'Church Clerk', role: 'Assistant' },
  { name: 'Arnold Mayaka', department: 'Church Clerk', role: 'Assistant' },
  
  // YOUTH MINISTRY
  { name: 'Mitchel Chabari', department: 'Youth Ministry', role: 'Leader' },
  { name: 'Joshua Nyakundi', department: 'Youth Ministry', role: 'Assistant' },
  { name: 'Nancy Gathoni', department: 'Youth Ministry', role: 'Member' },
  { name: 'Kevin Karanja', department: 'Youth Ministry', role: 'Assistant' },
  { name: 'Leonard Gitonga', department: 'Youth Ministry', role: 'Sponsor' },
  
  // MUSIC MINISTRY
  { name: 'George Ochogo', department: 'Music Ministry', role: 'Leader' },
  { name: 'Nancy Gathoni', department: 'Music Ministry', role: 'Assistant' },
  { name: 'Maureen Ochogo', department: 'Music Ministry', role: 'Member' },
  { name: 'Deborah Kemuma', department: 'Music Ministry', role: 'Member' },
  { name: 'Esther Bosibori', department: 'Music Ministry', role: 'Member' },
  { name: 'Henry Opiyo', department: 'Music Ministry', role: 'Member' },
  { name: 'Margaret Ng\'ang\'a', department: 'Music Ministry', role: 'Member' },
  { name: 'Beatrice Kemunto', department: 'Music Ministry', role: 'Member' },
  { name: 'Erick Nahayo', department: 'Music Ministry', role: 'Member' },
  { name: 'Michael Mboga', department: 'Music Ministry', role: 'Member' },
  { name: 'Abigael Omoke', department: 'Music Ministry', role: 'Member' },
  { name: 'James Ogato', department: 'Music Ministry', role: 'Member' },
  { name: 'Joyce Ogato', department: 'Music Ministry', role: 'Member' },
  { name: 'Ruth Monda', department: 'Music Ministry', role: 'Member' },
  { name: 'Neema Maoro', department: 'Music Ministry', role: 'Member' },
  { name: 'Roseline Wanja', department: 'Music Ministry', role: 'Member' },
  { name: 'Callister Bosibori', department: 'Music Ministry', role: 'Member' },
  { name: 'Lucy Kimani', department: 'Music Ministry', role: 'Member' },
  { name: 'Leah Gati', department: 'Music Ministry', role: 'Member' },
  { name: 'Nelly Sentoiya', department: 'Music Ministry', role: 'Member' },
  { name: 'Jane Wacuka', department: 'Music Ministry', role: 'Member' },
  
  // SABBATH SCHOOL
  { name: 'Kirsten Gathogo', department: 'Sabbath School', role: 'Leader' },
  { name: 'Milkah Rongai', department: 'Sabbath School', role: 'Assistant' },
  { name: 'Lizbeth Chabari', department: 'Sabbath School', role: 'Assistant' },
  { name: 'Geoffrey Karimi', department: 'Sabbath School', role: 'Assistant' },
  { name: 'Edwin Martin', department: 'Sabbath School', role: 'Secretary' },
  { name: 'Erick Nahayo', department: 'Sabbath School', role: 'Assistant Secretary' },
  { name: 'Damaris Oluke', department: 'Sabbath School', role: 'Assistant Secretary' },
  { name: 'Lucy Caleb', department: 'Sabbath School', role: 'Assistant Secretary' },
  { name: 'Mary Ndipau', department: 'Sabbath School', role: 'Assistant Secretary' },
  { name: 'Erick Mutembei', department: 'Sabbath School', role: 'Assistant Secretary' },
  { name: 'Michael Mboga', department: 'Sabbath School', role: 'Division Leader' },
  
  // Add more departments as needed...
];

class DirectUserCreator {
  generateUsername(name) {
    const parts = name.toLowerCase().split(' ');
    const firstName = parts[0].replace(/[^a-z]/g, '');
    const lastName = parts.length > 1 ? parts[parts.length - 1].replace(/[^a-z]/g, '') : '';
    
    if (firstName && lastName) {
      return `${firstName}.${lastName}`;
    } else if (firstName) {
      return firstName;
    } else {
      return 'user' + Math.floor(Math.random() * 1000);
    }
  }

  async createUsers() {
    try {
      console.log('🚀 Creating department users...');
      
      for (const member of departmentMembers) {
        try {
          // Generate username and password
          const username = this.generateUsername(member.name);
          const firstName = member.name.split(' ')[0].toLowerCase().replace(/[^a-z]/g, '');
          const password = `${firstName}@123`;
          
          // Hash password
          const hashedPassword = await bcrypt.hash(password, 10);
          
          // Create user
          const userResult = await pool.query(`
            INSERT INTO users (username, email, password_hash, first_name, last_name, is_active)
            VALUES ($1, $2, $3, $4, $5, true)
            ON CONFLICT (username) DO NOTHING
            RETURNING id
          `, [
            username,
            `${username}@sdachurchkiserian.org`,
            hashedPassword,
            firstName,
            member.name.split(' ').slice(1).join(' ') || ''
          ]);
          
          if (userResult.rows.length > 0) {
            const userId = userResult.rows[0].id;
            
            // Get department ID
            const deptResult = await pool.query(`
              SELECT id FROM departments WHERE name = $1
            `, [member.department]);
            
            if (deptResult.rows.length > 0) {
              const departmentId = deptResult.rows[0].id;
              
              // Assign to department
              await pool.query(`
                INSERT INTO department_members (user_id, department_id, role)
                VALUES ($1, $2, $3)
                ON CONFLICT (user_id, department_id) DO NOTHING
              `, [userId, departmentId, member.role]);
              
              console.log(`✅ Created: ${username} | Password: ${password} | ${member.department} - ${member.role}`);
            } else {
              console.log(`⚠️  Department not found: ${member.department} for user: ${username}`);
            }
          } else {
            console.log(`⚠️  User already exists: ${username} | Password: ${password}`);
          }
        } catch (error) {
          console.error(`❌ Error creating user for ${member.name}:`, error.message);
        }
      }
      
      console.log('✅ User creation completed!');
      
      // Create some test users for easy login
      await this.createTestUsers();
      
    } catch (error) {
      console.error('Error creating users:', error);
    } finally {
      await pool.end();
    }
  }

  async createTestUsers() {
    console.log('🔧 Creating test users for easy access...');
    
    const testUsers = [
      { username: 'admin', firstName: 'admin', password: 'admin@123', role: 'Super Admin' },
      { username: 'pastor', firstName: 'pastor', password: 'pastor@123', role: 'Pastor' },
      { username: 'member', firstName: 'member', password: 'member@123', role: 'Member' }
    ];
    
    for (const testUser of testUsers) {
      try {
        const hashedPassword = await bcrypt.hash(testUser.password, 10);
        
        await pool.query(`
          INSERT INTO users (username, email, password_hash, first_name, last_name, is_active)
          VALUES ($1, $2, $3, $4, $5, true)
          ON CONFLICT (username) DO UPDATE SET password_hash = $3
        `, [
          testUser.username,
          `${testUser.username}@sdachurchkiserian.org`,
          hashedPassword,
          testUser.firstName,
          'Test User'
        ]);
        
        // Add role
        const roleResult = await pool.query(`SELECT id FROM roles WHERE name = $1`, [testUser.role]);
        if (roleResult.rows.length > 0) {
          const userResult = await pool.query(`SELECT id FROM users WHERE username = $1`, [testUser.username]);
          if (userResult.rows.length > 0) {
            await pool.query(`
              INSERT INTO user_roles (user_id, role_id)
              VALUES ($1, $2)
              ON CONFLICT (user_id, role_id) DO NOTHING
            `, [userResult.rows[0].id, roleResult.rows[0].id]);
          }
        }
        
        console.log(`✅ Test user: ${testUser.username} | Password: ${testUser.password}`);
      } catch (error) {
        console.error(`❌ Error creating test user ${testUser.username}:`, error.message);
      }
    }
  }
}

// Run the user creation
const creator = new DirectUserCreator();
creator.createUsers().catch(console.error);
