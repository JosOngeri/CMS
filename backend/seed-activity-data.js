const { pool } = require('./config/database');

async function seedActivityData() {
  const client = await pool.connect();
  try {
    console.log('Starting comprehensive seed data generation...');
    
    // Get all users
    const usersResult = await client.query('SELECT id, first_name, last_name FROM users ORDER BY first_name');
    const users = usersResult.rows;
    console.log(`Found ${users.length} users`);
    
    // Get all departments
    const deptsResult = await client.query('SELECT id, name, slug FROM departments ORDER BY name');
    const departments = deptsResult.rows;
    console.log(`Found ${departments.length} departments`);
    
    let totalInserted = 0;
    
    // Helper to get random user
    const getRandomUser = () => users[Math.floor(Math.random() * users.length)];
    
    // Helper to get random department
    const getRandomDept = () => departments[Math.floor(Math.random() * departments.length)];
    
    // Helper to get random date in past year
    const getRandomDate = () => {
      const now = new Date();
      const pastYear = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      return new Date(pastYear.getTime() + Math.random() * (now.getTime() - pastYear.getTime()));
    };
    
    // 1. Add department members (each user joins 2-4 departments)
    console.log('\nAdding department members...');
    for (const user of users) {
      const numDepts = Math.floor(Math.random() * 3) + 2; // 2-4 departments
      const shuffledDepts = [...departments].sort(() => Math.random() - 0.5);
      
      for (let i = 0; i < numDepts; i++) {
        const dept = shuffledDepts[i];
        const joinedDate = getRandomDate();
        
        try {
          await client.query(`
            INSERT INTO department_members (user_id, department_id, role, is_active, joined_at)
            VALUES ($1, $2, $3, true, $4)
            ON CONFLICT (user_id, department_id) DO NOTHING
          `, [user.id, dept.id, ['Member', 'Leader', 'Assistant'][Math.floor(Math.random() * 3)], joinedDate]);
          totalInserted++;
        } catch (e) {
          // Ignore conflicts
        }
      }
    }
    console.log(`Added department members`);
    
    // 2. Create announcements (3-5 per department over the year)
    console.log('\nCreating announcements...');
    const announcementTitles = [
      'Weekly Meeting Reminder',
      'Special Event Announcement',
      'Department Update',
      'Volunteer Opportunity',
      'Training Session',
      'Holiday Schedule',
      'Project Kickoff',
      'Budget Review',
      'Strategic Planning',
      'Community Outreach'
    ];
    
    for (const dept of departments) {
      const numAnnouncements = Math.floor(Math.random() * 3) + 3;
      for (let i = 0; i < numAnnouncements; i++) {
        const author = getRandomUser();
        const createdDate = getRandomDate();
        
        await client.query(`
          INSERT INTO announcements (title, content, announcement_type, department_id, author_id, priority, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          announcementTitles[Math.floor(Math.random() * announcementTitles.length)],
          `This is an important announcement for ${dept.name}. Please review the details and take appropriate action.`,
          'department',
          dept.id,
          author.id,
          ['low', 'normal', 'high'][Math.floor(Math.random() * 3)],
          createdDate
        ]);
        totalInserted++;
      }
    }
    console.log(`Created announcements`);
    
    // 3. Create events (2-4 per department over the year)
    console.log('\nCreating events...');
    const eventTitles = [
      'Monthly Planning Meeting',
      'Training Workshop',
      'Community Service Day',
      'Leadership Retreat',
      'Team Building Event',
      'Prayer Meeting',
      'Bible Study Session',
      'Fundraising Event',
      'Conference Attendance',
      'Volunteer Training'
    ];
    
    for (const dept of departments) {
      const numEvents = Math.floor(Math.random() * 3) + 2;
      for (let i = 0; i < numEvents; i++) {
        const organizer = getRandomUser();
        const createdDate = getRandomDate();
        const eventDate = new Date(createdDate.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000);
        
        await client.query(`
          INSERT INTO events (title, description, event_date, location, department_id, organizer_id, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          eventTitles[Math.floor(Math.random() * eventTitles.length)],
          `Join us for this exciting event organized by ${dept.name}. All members are encouraged to participate.`,
          eventDate,
          ['Church Sanctuary', 'Fellowship Hall', 'Community Center', 'Online'][Math.floor(Math.random() * 4)],
          dept.id,
          organizer.id,
          createdDate
        ]);
        totalInserted++;
      }
    }
    console.log(`Created events`);
    
    // 4. Create audit log entries (user actions)
    console.log('\nCreating audit log entries...');
    const actions = [
      'join_department', 'leave_department', 'approve_membership', 'reject_membership',
      'grant_admin', 'revoke_admin', 'create_department', 'update_department',
      'add_department_member', 'remove_department_member'
    ];
    
    for (let i = 0; i < 500; i++) {
      const user = getRandomUser();
      const dept = getRandomDept();
      const action = actions[Math.floor(Math.random() * actions.length)];
      const createdDate = getRandomDate();
      
      const newValues = { department_id: dept.id };
      const oldValues = action === 'leave_department' ? { department_id: dept.id } : null;
      
      await client.query(`
        INSERT INTO audit_log (user_id, action, table_name, record_id, new_values, old_values, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        user.id,
        action,
        'departments',
        dept.id,
        JSON.stringify(newValues),
        oldValues ? JSON.stringify(oldValues) : null,
        createdDate
      ]);
      totalInserted++;
    }
    console.log(`Created audit log entries`);
    
    // 5. Create notifications
    console.log('\nCreating notifications...');
    const notificationTypes = [
      'approval_request', 'membership_approved', 'announcement', 'event_reminder',
      'task_assigned', 'meeting_invitation', 'system_update'
    ];
    
    for (let i = 0; i < 300; i++) {
      const recipient = getRandomUser();
      const type = notificationTypes[Math.floor(Math.random() * notificationTypes.length)];
      const createdDate = getRandomDate();
      
      await client.query(`
        INSERT INTO notifications (recipient_id, type, title, body, created_at, is_read)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        recipient.id,
        type,
        `${type.replace('_', ' ').toUpperCase()}`,
        `This is a ${type} notification for you. Please take appropriate action.`,
        createdDate,
        Math.random() > 0.5
      ]);
      totalInserted++;
    }
    console.log(`Created notifications`);
    
    console.log(`\n✅ Seed data generation complete! Total records inserted: ${totalInserted}`);
    console.log('Summary:');
    console.log('- Department members: Added');
    console.log('- Announcements: Created');
    console.log('- Events: Created');
    console.log('- Audit log entries: Created');
    console.log('- Notifications: Created');
    
  } catch (error) {
    console.error('Error seeding data:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seedActivityData().catch(console.error);
