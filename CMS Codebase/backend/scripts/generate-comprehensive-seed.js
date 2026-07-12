/**
 * Comprehensive Seed Data Generator for KMainCMS
 * Generates:
 * - 300 adult members
 * - 250 children members
 * - Church workers assigned to departments
 * - 1 year of communications data
 * - 1 year of church activities and events
 * - Financial data (tithes, offerings, expenses)
 */

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Database configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'kmaincms',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
});

// Kenyan names and data for realistic generation
const kenyanFirstNames = {
  male: ['James', 'John', 'Peter', 'Paul', 'George', 'Joseph', 'Samuel', 'David', 'Michael', 'Thomas', 
         'Daniel', 'Stephen', 'Robert', 'William', 'Richard', 'Charles', 'Henry', 'Edward', 'Fredrick', 'Martin',
         'Kennedy', 'Kevin', 'Brian', 'Arnold', 'Joel', 'Geoffrey', 'Jones', 'Francis', 'Samson', 'Jeremiah',
         'Moses', 'Elijah', 'Leonard', 'Okemwa', 'Mitchel', 'Joshua', 'Nancy', 'Casper', 'Raphael', 'Gerald',
         'Benard', 'Josiah', 'Mbatia', 'Henry', 'Abel', 'Rhoda', 'Kirsten', 'Eucabeth', 'Gladys', 'Linet',
         'Lizbeth', 'Edith', 'Moses', 'Maureen', 'Deborah', 'Esther', 'Beatrice', 'Margaret', 'Erick', 'Michael',
         'Abigael', 'Joyce', 'Ruth', 'Neema', 'Roseline', 'Callister', 'Lucy', 'Leah', 'Nelly', 'Jane',
         'Sarah', 'Jadson', 'Monicah', 'Salome', 'Rachel', 'Mary', 'Emmanuel', 'Hartley', 'Verah', 'Millicent',
         'Mellen', 'Julian', 'Casian', 'Oscar', 'Ian', 'Ryan', 'Tyler', 'Ethan', 'Noah', 'Liam'],
  female: ['Mary', 'Elizabeth', 'Grace', 'Hannah', 'Sarah', 'Ruth', 'Naomi', 'Esther', 'Martha', 'Rebecca',
           'Rachel', 'Leah', 'Miriam', 'Deborah', 'Judith', 'Anna', 'Priscilla', 'Lydia', 'Phoebe', 'Dorcas',
           'Zipporah', 'Mercy', 'Jane', 'Rosemary', 'Veronicah', 'Evalyn', 'Bancy', 'Monicah', 'Leonidah', 'Irene',
           'Redemptah', 'Evalyne', 'Mintlet', 'Damaris', 'Alice', 'Millicent', 'Nancy', 'Dorcas', 'Callister', 'Ruth',
           'Mary', 'Elizabeth', 'Orna', 'Christine', 'Lucy', 'Virginiah', 'Rachel', 'Maureen', 'Deborah', 'Esther',
           'Beatrice', 'Margaret', 'Abigael', 'Joyce', 'Ruth', 'Neema', 'Roseline', 'Callister', 'Lucy', 'Leah',
           'Nelly', 'Jane', 'Sarah', 'Monicah', 'Salome', 'Rachel', 'Mary', 'Eucabeth', 'Gladys', 'Linet',
           'Lizbeth', 'Edith', 'Julian', 'Mellen', 'Emily', 'Sophia', 'Olivia', 'Emma', 'Ava', 'Isabella',
           'Mia', 'Charlotte', 'Amelia', 'Harper', 'Evelyn', 'Abigail', 'Emily', 'Sofia', 'Avery', 'Ella']
};

const kenyanLastNames = ['Ng\'ang\'a', 'Monda', 'Karongo', 'Onchogo', 'Khamala', 'Gichinga', 'Mokua', 'Gitonga',
                         'Onyancha', 'Mogesa', 'Ruuge', 'Onchari', 'Omae', 'Kuraru', 'Amalemba', 'Ongeri', 'Wachira',
                         'Mokaya', 'Mbatia', 'Auka', 'Mboya', 'Maoro', 'Karimi', 'Ogato', 'Momanyi', 'Mayaka', 'Matheri',
                         'Muyaki', 'Wandera', 'Kinywa', 'Nyaribo', 'Ndipau', 'Sane', 'Mulongo', 'Oganda', 'Isaiah',
                         'Achoki', 'Kiongo', 'Gachege', 'Bosibori', 'Ndungu', 'Mutune', 'Wamuyu', 'Mboi', 'Nyakige',
                         'Nzilani', 'Omwenga', 'Kwamboka', 'Onchari', 'Chabari', 'Ogwoka', 'Opiyo', 'Okoth', 'Maihanyu',
                         'Mogesa', 'Chabari', 'Gathoni', 'Karanja', 'Lewis', 'Njoroge', 'Okoth', 'Magembe', 'Karugia',
                         'Maoro', 'Magati', 'Gichuki', 'Benson', 'Atswenje', 'Makaya', 'Mukiri', 'Magembe', 'Omoke',
                         'Gichinga', 'Mboga', 'Caleb', 'Wanjiru', 'Gatheru', 'Ochogo', 'Kemuma', 'Kemunto', 'Nahayo',
                         'Monda', 'Sentoiya', 'Wacuka', 'Nyakundi', 'Mahianyu', 'Mabiria', 'Ombati', 'Omesa', 'Tendei',
                         'Ndung\'u', 'Mokaya', 'Mukiri', 'Gathogo', 'Rongai', 'Martin', 'Chieng\'a', 'Keranga', 'Kimori',
                         'Magembe', 'Mureithi', 'Nyamweya', 'Ogweri', 'Njoroge', 'Wachira', 'Okemwa'];

const locations = ['Kiserian', 'Oloirien', 'Nkarusha', 'Ngong', 'Karen', 'Langata', 'Rongai', 'Kikuyu', 'Limuru', 'Nairobi'];
const occupations = ['Teacher', 'Farmer', 'Business Owner', 'Engineer', 'Doctor', 'Nurse', 'Accountant', 'Driver',
                     'Pastor', 'Social Worker', 'Police Officer', 'Banker', 'Lawyer', 'Architect', 'IT Professional',
                     'Salesperson', 'Chef', 'Electrician', 'Plumber', 'Mechanic', 'Farmer', 'Student', 'Retired', 'Homemaker'];

const phonePrefixes = ['0721', '0722', '0723', '0724', '0725', '0726', '0727', '0728', '0729',
                       '0731', '0732', '0733', '0734', '0735', '0736', '0737', '0738', '0739',
                       '0741', '0742', '0743', '0744', '0745', '0746', '0747', '0748', '0749',
                       '0751', '0752', '0753', '0754', '0755', '0756', '0757', '0758', '0759',
                       '0761', '0762', '0763', '0764', '0765', '0766', '0767', '0768', '0769',
                       '0791', '0792', '0793', '0794', '0795', '0796', '0797', '0798', '0799'];

// Church workers data from the file
const churchWorkersData = {
  elders: [
    { name: 'George Ng\'ang\'a', role: '1st Elder' },
    { name: 'John Monda', role: '2nd Elder' },
    { name: 'Paul Karongo', role: 'Elder' },
    { name: 'George Onchogo', role: 'Elder' },
    { name: 'Stephen Ng\'ang\'a', role: 'Elder' },
    { name: 'Moses Khamala', role: 'Elder' },
    { name: 'Thomas Gichinga', role: 'Elder' },
    { name: 'Elijah Mokua', role: 'Elder' },
    { name: 'Leonard Gitonga', role: 'Elder' },
    { name: 'Stephen Onyancha', role: 'Elder' },
    { name: 'Joash Mogesa', role: 'Elder' },
    { name: 'Robert Ruuge', role: 'Elder' },
    { name: 'Samuel Onchari', role: 'Elder' },
    { name: 'Samson Omae', role: 'Elder' },
    { name: 'Jeremiah Kuraru', role: 'Elder - Oloirien' },
    { name: 'Martin Amalemba', role: 'Elder - Nkarusha' },
    { name: 'Edward Ongeri', role: 'Elder - Nkarusha' },
    { name: 'Fredrick Wachira', role: 'Elder' },
    { name: 'Henry Mokaya', role: 'Elder' }
  ],
  deacons: [
    { name: 'Kennedy Mbatia', role: 'Head Deacon' },
    { name: 'Joseph Auka', role: 'Assistant Deacon' },
    { name: 'Tom Mboya', role: 'Deacon' },
    { name: 'Joel Maoro', role: 'Deacon' },
    { name: 'Geoffrey Karimi', role: 'Deacon' },
    { name: 'James Ogato', role: 'Deacon' },
    { name: 'Jones Momanyi', role: 'Deacon' },
    { name: 'Arnold Mayaka', role: 'Deacon' },
    { name: 'Francis Ng\'ang\'a Matheri', role: 'Deacon' },
    { name: 'George Muyaki', role: 'Deacon' },
    { name: 'Juvenalis Wandera', role: 'Deacon' },
    { name: 'Samuel Kinywa', role: 'Deacon' },
    { name: 'Daniel Nyaribo', role: 'Deacon' },
    { name: 'Peter Ndipau', role: 'Deacon - Oloirien' },
    { name: 'Kevin Sane', role: 'Deacon - Oloirien' },
    { name: 'Brian Mulongo', role: 'Deacon - Nkarusha' },
    { name: 'Kennedy Mwambi Oganda', role: 'Deacon' }
  ],
  deaconesses: [
    { name: 'Zipporah Isaiah', role: 'Head Deaconess' },
    { name: 'Mercy Achoki', role: 'Assistant Deaconess' },
    { name: 'Jane Kiongo', role: 'Deaconess' },
    { name: 'Rosemary Gachege', role: 'Deaconess' },
    { name: 'Esther Bosibori', role: 'Deaconess' },
    { name: 'Veronicah Ndungu', role: 'Deaconess' },
    { name: 'Evalyn Mokaya', role: 'Deaconess' },
    { name: 'Bancy Njogu', role: 'Deaconess' },
    { name: 'Elizabeth Mutune', role: 'Deaconess' },
    { name: 'Monicah Wamuyu', role: 'Deaconess' },
    { name: 'Leonidah Mboi', role: 'Deaconess' },
    { name: 'Irene Nyakige', role: 'Deaconess' },
    { name: 'Mary Ndipau', role: 'Deaconess - Oloirien' },
    { name: 'Redemptah Nzilani', role: 'Deaconess - Oloirien' },
    { name: 'Evalyne Moraa Omwenga', role: 'Deaconess - Nkarusha' },
    { name: 'Mintlet Amalemba', role: 'Deaconess - Nkarusha' },
    { name: 'Damaris Kwamboka', role: 'Deaconess - Nkarusha' },
    { name: 'Alice Onchari', role: 'Deaconess' }
  ],
  treasurer: [
    { name: 'Elizabeth Mboya', role: 'Treasurer' }
  ],
  treasurerAssistants: [
    { name: 'Isaac Chabari', role: 'Assistant Treasurer' },
    { name: 'Brian Mboga', role: 'Assistant Treasurer' },
    { name: 'Ambrose Mbugua', role: 'Assistant Treasurer' },
    { name: 'Lucy Caleb', role: 'Assistant Treasurer - Nkarusha' },
    { name: 'Lucy Wanjiru', role: 'Assistant Treasurer - Nkarusha' },
    { name: 'Lilian Kawira', role: 'Assistant Treasurer - Oloirien' }
  ],
  churchClerk: [
    { name: 'Esther Okemwa', role: 'Church Clerk' }
  ],
  clerkAssistants: [
    { name: 'Joshua Nyakundi', role: 'Assistant Clerk' },
    { name: 'Arnold Mayaka', role: 'Assistant Clerk' }
  ]
};

// Department mappings
const departmentMappings = {
  'Elders': 'elders',
  'Deaconry': 'deacons',
  'Deaconry': 'deaconesses',
  'Treasurer': 'treasurer',
  'Treasurer': 'treasurerAssistants',
  'Church Clerk': 'churchClerk',
  'Church Clerk': 'clerkAssistants',
  'Youth Ministry': 'youth',
  'Children Ministry': 'children',
  'Adventist Men Ministry': 'men',
  'Adventist Women Ministry': 'women',
  'Music Ministry': 'music',
  'Sabbath School': 'sabbath',
  'Pathfinder': 'pathfinder',
  'Health Ministry': 'health',
  'Personal Ministry': 'personal',
  'Evangelism': 'evangelism',
  'Stewardship': 'stewardship',
  'Dorcas': 'dorcas',
  'Family Life': 'family',
  'Interest Coordinator': 'interest',
  'Adventist Possibility Ministry': 'possibility',
  'Adventurer Club': 'adventurer',
  'Ambassadors': 'ambassadors',
  'VBS': 'vbs',
  'Prayer Ministry': 'prayer',
  'Religious Liberty': 'liberty',
  'Nurture and Retention': 'nurture',
  'Communication Secretary': 'communication',
  'Camp Meeting': 'camp',
  'Development': 'development',
  'Welfare': 'welfare',
  'Education': 'education',
  'Library': 'library',
  'School Chair': 'school',
  'Choristers': 'choristers',
  'Church Choir': 'choir',
  'Pianist': 'pianist',
  'PA System': 'pa',
  'V.O.P./S.O.P.': 'vop'
};

// Helper functions
function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function generatePhoneNumber() {
  const prefix = getRandomElement(phonePrefixes);
  const suffix = Math.floor(100000 + Math.random() * 900000);
  return `${prefix}${suffix}`;
}

function generateEmail(firstName, lastName, suffix = '') {
  const domains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
  const cleanName = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`.replace(/'/g, '').replace(/\s/g, '');
  const suffixStr = suffix ? `.${suffix}` : '';
  return `${cleanName}${suffixStr}@${getRandomElement(domains)}`;
}

function parseName(fullName) {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: getRandomElement(kenyanLastNames) };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

function generateMember(isChild = false, index) {
  const gender = Math.random() > 0.5 ? 'male' : 'female';
  const firstName = getRandomElement(kenyanFirstNames[gender]);
  const lastName = getRandomElement(kenyanLastNames);
  
  const birthYear = isChild 
    ? 2010 + Math.floor(Math.random() * 8) // Children born 2010-2018
    : 1960 + Math.floor(Math.random() * 40); // Adults born 1960-2000
  
  const birthDate = new Date(birthYear, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
  const joinedDate = getRandomDate(new Date(2015, 0, 1), new Date(2024, 11, 31));
  const baptismDate = getRandomDate(joinedDate, new Date(2024, 11, 31));
  
  return {
    membership_number: `KMC${String(index + 1).padStart(4, '0')}`,
    first_name: firstName,
    last_name: lastName,
    date_of_birth: formatDate(birthDate),
    gender: gender.charAt(0).toUpperCase() + gender.slice(1),
    marital_status: isChild ? 'Single' : getRandomElement(['Single', 'Married', 'Widowed', 'Divorced']),
    occupation: isChild ? 'Student' : getRandomElement(occupations),
    address: `${Math.floor(Math.random() * 999) + 1} ${getRandomElement(locations)} Road`,
    city: getRandomElement(locations),
    phone: generatePhoneNumber(),
    email: generateEmail(firstName, lastName, index),
    baptism_date: formatDate(baptismDate),
    membership_status: 'active',
    joined_date: formatDate(joinedDate),
    notes: isChild ? 'Sabbath School student' : 'Active member',
    church_slug: 'kiserian-main-sda'
  };
}

// Main seed function
async function generateSeedData() {
  console.log('Starting comprehensive seed data generation...');
  
  const client = await pool.connect();
  
  try {
    // Don't use transaction for now to see immediate results
    // await client.query('BEGIN');
    
    // 1. Generate 300 adult members
    console.log('Generating 300 adult members...');
    const adultMembers = [];
    for (let i = 0; i < 300; i++) {
      adultMembers.push(generateMember(false, i));
    }
    
    // Check if members table exists and has the right structure
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'members'
      )
    `);
    
    if (tableCheck.rows[0].exists) {
      // Insert adult members
      let insertedCount = 0;
      for (const member of adultMembers) {
        try {
          const result = await client.query(
            `INSERT INTO members (membership_number, first_name, last_name, date_of_birth, gender, 
             marital_status, occupation, address, city, phone, email, baptism_date, membership_status, 
             joined_date, notes, church_slug) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) 
             ON CONFLICT (membership_number) DO NOTHING`,
            [member.membership_number, member.first_name, member.last_name, member.date_of_birth,
             member.gender, member.marital_status, member.occupation, member.address, member.city,
             member.phone, member.email, member.baptism_date, member.membership_status,
             member.joined_date, member.notes, member.church_slug]
          );
          if (result.rowCount > 0) {
            insertedCount++;
          }
        } catch (error) {
          console.log('Error inserting member:', error.message);
        }
      }
      console.log(`300 adult members processed, ${insertedCount} actually inserted`);
    } else {
      console.log('Members table does not exist, skipping member generation');
    }
    
    // 2. Generate 250 children members
    console.log('Generating 250 children members...');
    const childMembers = [];
    for (let i = 0; i < 250; i++) {
      childMembers.push(generateMember(true, i + 300));
    }
    
    if (tableCheck.rows[0].exists) {
      // Insert child members
      let insertedCount = 0;
      for (const member of childMembers) {
        try {
          const result = await client.query(
            `INSERT INTO members (membership_number, first_name, last_name, date_of_birth, gender, 
             marital_status, occupation, address, city, phone, email, baptism_date, membership_status, 
             joined_date, notes, church_slug) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) 
             ON CONFLICT (membership_number) DO NOTHING`,
            [member.membership_number, member.first_name, member.last_name, member.date_of_birth,
             member.gender, member.marital_status, member.occupation, member.address, member.city,
             member.phone, member.email, member.baptism_date, member.membership_status,
             member.joined_date, member.notes, member.church_slug]
          );
          if (result.rowCount > 0) {
            insertedCount++;
          }
        } catch (error) {
          console.log('Error inserting child member:', error.message);
        }
      }
      console.log(`250 children members processed, ${insertedCount} actually inserted`);
    } else {
      console.log('Members table does not exist, skipping child member generation');
    }
    
    // 3. Create users for church workers and assign to departments
    console.log('Creating users for church workers...');
    
    // Get all departments
    const departmentsResult = await client.query('SELECT id, name FROM departments');
    const departments = departmentsResult.rows;
    const departmentMap = {};
    departments.forEach(dept => {
      departmentMap[dept.name] = dept.id;
    });
    
    // Check if department_members table exists
    const deptMembersCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'department_members'
      )
    `);
    
    // Process church workers and create users
    const allWorkers = [
      ...churchWorkersData.elders.map(w => ({ ...w, department: 'Elders' })),
      ...churchWorkersData.deacons.map(w => ({ ...w, department: 'Deaconry' })),
      ...churchWorkersData.deaconesses.map(w => ({ ...w, department: 'Deaconry' })),
      ...churchWorkersData.treasurer.map(w => ({ ...w, department: 'Treasurer' })),
      ...churchWorkersData.treasurerAssistants.map(w => ({ ...w, department: 'Treasurer' })),
      ...churchWorkersData.churchClerk.map(w => ({ ...w, department: 'Church Clerk' })),
      ...churchWorkersData.clerkAssistants.map(w => ({ ...w, department: 'Church Clerk' }))
    ];
    
    let workerIndex = 0;
    for (const worker of allWorkers) {
      const { firstName, lastName } = parseName(worker.name);
      const username = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`.replace(/'/g, '').replace(/\s/g, '') + workerIndex;
      const email = generateEmail(firstName, lastName, `worker${workerIndex}`);
      const passwordHash = await bcrypt.hash('password123', 12);
      workerIndex++;
      
      // Check if user exists first
      let userId;
      const existingUser = await client.query('SELECT id FROM users WHERE email = $1 OR username = $2', [email, username]);
      if (existingUser.rows.length > 0) {
        userId = existingUser.rows[0].id;
        console.log(`User with email ${email} or username ${username} already exists, using existing user ID ${userId}`);
      } else {
        // Insert new user
        const userResult = await client.query(
          `INSERT INTO users (email, password_hash, first_name, last_name, username, phone, is_active, email_verified) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
          [email, passwordHash, firstName, lastName, username, generatePhoneNumber(), true, true]
        );
        userId = userResult.rows[0].id;
      }
      
      // Assign to department if table exists
      if (deptMembersCheck.rows[0].exists && departmentMap[worker.department]) {
        try {
          const result = await client.query(
            `INSERT INTO department_members (user_id, department_id, role, is_active, joined_at) 
             VALUES ($1, $2, $3, $4, NOW()) ON CONFLICT (user_id, department_id) DO NOTHING`,
            [userId, departmentMap[worker.department], worker.role, true]
          );
          if (result.rowCount > 0) {
            console.log(`Assigned ${worker.name} to ${worker.department}`);
          }
        } catch (error) {
          console.log('Error assigning department membership:', error.message);
        }
      }
    }
    console.log('Church workers created and assigned to departments');
    
    // Get a default user for sender and author
    const users = await client.query('SELECT id FROM users LIMIT 1');
    const senderId = users.rows.length > 0 ? users.rows[0].id : null;
    const authorId = users.rows.length > 0 ? users.rows[0].id : null;
    
    // Define one year ago date for use in multiple sections
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    // 4. Generate 1 year of communications data
    console.log('Generating 1 year of communications data...');
    const commCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'department_communications'
      )
    `);
    
    if (commCheck.rows[0].exists && departments.length > 0) {
      const communicationTypes = ['Announcement', 'Meeting', 'Report', 'Update', 'Reminder'];
      const priorities = ['urgent', 'high', 'normal', 'low'];
      const communicationTemplates = [
        { title: 'Weekly Service Schedule', message: 'Please join us for our weekly Sabbath services starting at 9:00 AM.' },
        { title: 'Prayer Meeting', message: 'Mid-week prayer meeting will be held on Wednesday at 6:00 PM.' },
        { title: 'Board Meeting', message: 'Monthly church board meeting scheduled for next Tuesday.' },
        { title: 'Special Program', message: 'Join us for a special program this Sabbath.' },
        { title: 'Community Outreach', message: 'Community outreach event this weekend - volunteers needed.' },
        { title: 'Youth Event', message: 'Youth ministry has organized an event for all young people.' },
        { title: 'Children Ministry', message: 'Sabbath school needs volunteers for this quarter.' },
        { title: 'Health Ministry', message: 'Health screening event coming up next month.' },
        { title: 'Financial Update', message: 'Monthly financial report is now available for review.' },
        { title: 'Church Clean-up', message: 'Church clean-up day scheduled for this Saturday.' }
      ];
      
      let insertedCount = 0;
      for (let i = 0; i < 200; i++) {
        const template = getRandomElement(communicationTemplates);
        const date = getRandomDate(oneYearAgo, new Date());
        const department = getRandomElement(departments);
        
        try {
          const result = await client.query(
            `INSERT INTO department_communications (department_id, title, message, type, priority, sender_id, sent_at) 
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [department.id, template.title, template.message, getRandomElement(communicationTypes),
             getRandomElement(priorities), senderId, date]
          );
          if (result.rowCount > 0) {
            insertedCount++;
          }
        } catch (error) {
          console.log('Error inserting communication:', error.message);
        }
      }
      console.log(`200 communications processed, ${insertedCount} actually inserted`);
    } else {
      console.log('Department communications table does not exist or no departments, skipping communications generation');
    }
    
    // 5. Generate 1 year of church activities and events
    console.log('Generating 1 year of church activities and events...');
    const contentCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'content_items'
      )
    `);
    
    if (contentCheck.rows[0].exists) {
      const eventTypes = ['Sabbath Service', 'Prayer Meeting', 'Board Meeting', 'Youth Program', 'Children Program',
                         'Community Service', 'Special Seminar', 'Camp Meeting', 'VBS', 'Pathfinder Club',
                         'Health Seminar', 'Family Life Event', 'Music Festival', 'Evangelism', 'Baptism'];
      const eventDescriptions = [
        'Regular Sabbath worship service',
        'Mid-week prayer and fellowship',
        'Monthly church business meeting',
        'Youth fellowship and activities',
        'Children Sabbath school program',
        'Community outreach and service',
        'Special educational seminar',
        'Annual spiritual camp meeting',
        'Vacation Bible School for children',
        'Pathfinder club meeting and activities',
        'Health and wellness seminar',
        'Family life and marriage enrichment',
        'Church music and choir festival',
        'Community evangelism campaign',
        'Baptismal ceremony for new members'
      ];
      
      // Get a default category
      const categories = await client.query('SELECT id FROM content_categories WHERE name = $1', ['Events']);
      const categoryId = categories.rows.length > 0 ? categories.rows[0].id : null;
      
      let insertedCount = 0;
      for (let i = 0; i < 150; i++) {
        const date = getRandomDate(oneYearAgo, new Date());
        const eventType = getRandomElement(eventTypes);
        
        try {
          const result = await client.query(
            `INSERT INTO content_items (title, slug, content, content_type, category_id, author_id, status, published_at, created_at) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [eventType, `${eventType.toLowerCase().replace(/\s/g, '-')}-${Date.now()}-${i}`,
             getRandomElement(eventDescriptions), 'post', categoryId, authorId, 'published', date, date]
          );
          if (result.rowCount > 0) {
            insertedCount++;
          }
        } catch (error) {
          console.log('Error inserting content item:', error.message);
        }
      }
      console.log(`150 events processed, ${insertedCount} actually inserted`);
    } else {
      console.log('Content items table does not exist, skipping events generation');
    }
    
    // 6. Generate financial data (tithes, offerings, expenses)
    console.log('Generating financial data...');
    
    try {
      // Check if treasury tables exist
      const treasuryCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'income_categories'
        )
      `);
      
      if (treasuryCheck.rows[0].exists) {
        // Get income and expense categories
        const incomeCategories = await client.query('SELECT id FROM income_categories');
        const expenseCategories = await client.query('SELECT id FROM expense_categories');
        const accounts = await client.query('SELECT id FROM church_accounts');
        
        // Create default account if none exists
        let accountId;
        if (accounts.rows.length === 0) {
          const accountResult = await client.query(
            `INSERT INTO church_accounts (account_name, account_number, bank_name, account_type, balance, is_active) 
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
            ['Main Church Account', '1234567890', 'Equity Bank', 'checking', 0, true]
          );
          accountId = accountResult.rows[0].id;
          console.log('Created default church account');
        } else {
          accountId = accounts.rows[0].id;
        }
        
        // Generate tithes and offerings (income)
        for (let i = 0; i < 1200; i++) { // ~100 per month for 12 months
          const date = getRandomDate(oneYearAgo, new Date());
          const amount = 500 + Math.floor(Math.random() * 5000); // 500-5500 KES
          const category = getRandomElement(incomeCategories.rows);
          
          await client.query(
            `INSERT INTO transactions (transaction_type, category_id, account_id, amount, description, 
             transaction_date, status, payment_method) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            ['income', category.id, accountId, amount, 'Weekly tithe/offering', formatDate(date),
             'approved', getRandomElement(['cash', 'mobile_money', 'bank_transfer'])]
          );
        }
        console.log('1200 income transactions generated');
        
        // Generate expenses
        for (let i = 0; i < 400; i++) { // ~33 per month for 12 months
          const date = getRandomDate(oneYearAgo, new Date());
          const amount = 1000 + Math.floor(Math.random() * 15000); // 1000-16000 KES
          const category = getRandomElement(expenseCategories.rows);
          
          await client.query(
            `INSERT INTO transactions (transaction_type, category_id, account_id, amount, description, 
             transaction_date, status, payment_method) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            ['expense', category.id, accountId, amount, 'Operational expense', formatDate(date),
             'approved', getRandomElement(['cash', 'bank_transfer', 'check'])]
          );
        }
        console.log('400 expense transactions generated');
      } else {
        console.log('Treasury tables do not exist yet, skipping financial data generation');
      }
    } catch (error) {
      console.log('Error generating financial data (treasury tables may not exist):', error.message);
    }
    
    // 7. Generate member attendance
    console.log('Generating member attendance data...');
    try {
      const membersResult = await client.query('SELECT id FROM members');
      const members = membersResult.rows;
      
      for (const member of members.slice(0, 100)) { // Generate for 100 members
        const numAttendances = 20 + Math.floor(Math.random() * 30); // 20-50 attendances per member
        for (let i = 0; i < numAttendances; i++) {
          const date = getRandomDate(oneYearAgo, new Date());
          const serviceType = getRandomElement(['Sabbath School', 'Divine Service', 'Mid-week Prayer']);
          
          await client.query(
            `INSERT INTO member_attendance (member_id, service_date, service_type, attended) 
             VALUES ($1, $2, $3, $4)`,
            [member.id, formatDate(date), serviceType, Math.random() > 0.1] // 90% attendance rate
          );
        }
      }
      console.log('Member attendance data generated');
    } catch (error) {
      console.log('Error generating member attendance data:', error.message);
    }
    
    console.log('All seed data generated successfully!');
    
  } catch (error) {
    console.error('Error generating seed data:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the seed
generateSeedData()
  .then(() => {
    console.log('Seed data generation completed');
    pool.end();
  })
  .catch(error => {
    console.error('Seed data generation failed:', error);
    pool.end();
    process.exit(1);
  });
