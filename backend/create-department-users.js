const fs = require('fs').promises;
const bcrypt = require('bcryptjs');
const { pool } = require('./config/database');

class DepartmentUserCreator {
  constructor() {
    this.users = [];
    this.departments = [];
  }

  // Parse the church workers list
  async parseWorkersList() {
    try {
      const workersData = await fs.readFile('../Data/Church workers List with departments.txt', 'utf8');
      const lines = workersData.split('\n');
      
      let currentDepartment = '';
      let currentCategory = '';
      let role = 'Member';
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Skip empty lines and headers
        if (!line || line === 'CHURCH BOARD MEMBERS' || line.startsWith('---')) {
          continue;
        }
        
        // Check if it's a department header (all caps)
        if (line === line.toUpperCase() && !line.includes('.')) {
          currentDepartment = line;
          currentCategory = this.getDepartmentCategory(line);
          role = 'Member';
          continue;
        }
        
        // Check if it's a sub-department header
        if (line.includes('a)') || line.includes('b)') || line.includes('Leader') || line.includes('Director')) {
          if (line.includes('Leader') || line.includes('Director')) {
            role = 'Leader';
          } else if (line.includes('Assistant')) {
            role = 'Assistant';
          } else if (line.includes('Secretary')) {
            role = 'Secretary';
          }
          continue;
        }
        
        // Parse individual entries
        if (line.match(/^\d+\./) || line.match(/^[A-Z]/)) {
          const memberInfo = this.parseMemberInfo(line, currentDepartment, currentCategory, role);
          if (memberInfo) {
            this.users.push(memberInfo);
          }
        }
      }
      
      console.log(`Parsed ${this.users.length} users from workers list`);
      return this.users;
    } catch (error) {
      console.error('Error parsing workers list:', error);
      return [];
    }
  }

  // Parse individual member information
  parseMemberInfo(line, department, category, role) {
    try {
      // Remove numbering and clean up
      let cleanLine = line.replace(/^\d+\.\s*/, '').trim();
      
      // Extract name and role
      let name = '';
      let memberRole = role;
      
      // Handle different formats
      if (cleanLine.includes('–')) {
        const parts = cleanLine.split('–');
        name = parts[0].trim();
        
        // Check for specific role in the second part
        if (parts[1]) {
          const roleText = parts[1].toLowerCase();
          if (roleText.includes('head') || roleText.includes('leader')) {
            memberRole = 'Leader';
          } else if (roleText.includes('assistant')) {
            memberRole = 'Assistant';
          } else if (roleText.includes('secretary')) {
            memberRole = 'Secretary';
          } else if (roleText.includes('sponsor')) {
            memberRole = 'Member'; // Sponsors are members
          }
        }
      } else if (cleanLine.includes('-')) {
        const parts = cleanLine.split('-');
        name = parts[0].trim();
        
        if (parts[1]) {
          const roleText = parts[1].toLowerCase();
          if (roleText.includes('head') || roleText.includes('leader')) {
            memberRole = 'Leader';
          } else if (roleText.includes('assistant')) {
            memberRole = 'Assistant';
          } else if (roleText.includes('secretary')) {
            memberRole = 'Secretary';
          }
        }
      } else {
        name = cleanLine;
      }
      
      // Clean up name (remove extra info in parentheses, etc.)
      name = name.split('(')[0].trim();
      name = name.split('-')[0].trim();
      
      // Extract first name for password
      const firstName = name.split(' ')[0].toLowerCase().replace(/[^a-z]/g, '');
      
      if (!firstName) {
        console.log('Could not extract first name from:', name);
        return null;
      }
      
      return {
        name: name,
        firstName: firstName,
        username: this.generateUsername(name),
        password: `${firstName}@123`,
        department: department,
        category: category,
        role: memberRole,
        email: `${firstName.toLowerCase()}@sdachurchkiserian.org`
      };
    } catch (error) {
      console.error('Error parsing member info:', error);
      return null;
    }
  }

  // Generate username from name
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

  // Get department category
  getDepartmentCategory(departmentName) {
    const leadershipDepts = ['ELDERS', 'DEACONRY', 'TREASURER', 'CHURCH CLERK'];
    const ministryDepts = ['YOUTH MINISTRY', 'CHILDREN MINISTRY', 'ADVENTIST MEN MINISTRY', 'ADVENTIST WOMEN MINISTRY', 'HEALTH MINISTRY', 'FAMILY LIFE', 'MUSIC MINISTRY', 'PRAYER MINISTRY', 'PERSONAL MINISTRY', 'PUBLISHING', 'EVANGELISM', 'STEWARDSHIP', 'RELIGIOUS LIBERTY'];
    const educationDepts = ['SABBATH SCHOOL', 'EDUCATION', 'SCHOOL CHAIR', 'LIBRARIAN', 'V.O.P./S.O.P.'];
    const youthDepts = ['ADVENTURER CLUB', 'AMBASSADORS', 'PATHFINDER', 'VBS'];
    const supportDepts = ['DORCAS', 'INTEREST COORDINATOR', 'ADVENTIST POSSIBILITY MINISTRY', 'WELFARE', 'DEVELOPMENT', 'COMMUNICATION SECRETARY'];
    const specialDepts = ['CAMP MEETING', 'NURTURE AND RETENTION', 'A.M.R.'];
    const musicDepts = ['CHORISTERS', 'CHURCH CHOIR', 'PIANIST', 'PA SYSTEM'];

    if (leadershipDepts.some(dept => departmentName.includes(dept))) return 'Leadership';
    if (ministryDepts.some(dept => departmentName.includes(dept))) return 'Ministry';
    if (educationDepts.some(dept => departmentName.includes(dept))) return 'Education';
    if (youthDepts.some(dept => departmentName.includes(dept))) return 'Youth';
    if (musicDepts.some(dept => departmentName.includes(dept))) return 'Ministry';
    if (supportDepts.some(dept => departmentName.includes(dept))) return 'Support';
    if (specialDepts.some(dept => departmentName.includes(dept))) return 'Special';
    
    return 'Other';
  }

  // Create users in database
  async createUsers() {
    try {
      console.log('Creating users in database...');
      
      for (const user of this.users) {
        try {
          // Hash password
          const hashedPassword = await bcrypt.hash(user.password, 10);
          
          // Create user
          const userResult = await pool.query(`
            INSERT INTO users (username, email, password_hash, first_name, last_name, is_active)
            VALUES ($1, $2, $3, $4, $5, true)
            ON CONFLICT (username) DO NOTHING
            RETURNING id
          `, [
            user.username,
            user.email,
            hashedPassword,
            user.firstName,
            user.name.split(' ').slice(1).join(' ') || ''
          ]);
          
          if (userResult.rows.length > 0) {
            const userId = userResult.rows[0].id;
            
            // Get department ID
            const deptResult = await pool.query(`
              SELECT id FROM departments WHERE name = $1
            `, [user.department]);
            
            if (deptResult.rows.length > 0) {
              const departmentId = deptResult.rows[0].id;
              
              // Assign to department
              await pool.query(`
                INSERT INTO department_members (user_id, department_id, role)
                VALUES ($1, $2, $3)
                ON CONFLICT (user_id, department_id) DO NOTHING
              `, [userId, departmentId, user.role]);
              
              console.log(`✅ Created user: ${user.username} (${user.name}) - ${user.department} - ${user.role}`);
            } else {
              console.log(`⚠️  Department not found: ${user.department} for user: ${user.username}`);
            }
          } else {
            console.log(`⚠️  User already exists: ${user.username}`);
          }
        } catch (error) {
          console.error(`❌ Error creating user ${user.username}:`, error.message);
        }
      }
      
      console.log('User creation completed!');
    } catch (error) {
      console.error('Error creating users:', error);
    }
  }

  // Main execution method
  async run() {
    console.log('🚀 Starting department user creation...');
    
    // Parse workers list
    await this.parseWorkersList();
    
    if (this.users.length === 0) {
      console.log('❌ No users found to create');
      return;
    }
    
    // Create users in database
    await this.createUsers();
    
    console.log(`✅ Processed ${this.users.length} users`);
    
    // Close database connection
    await pool.end();
  }
}

// Run the user creation
const creator = new DepartmentUserCreator();
creator.run().catch(console.error);
