const path = require('path');
const { Client } = require('pg');
const bcrypt = require('bcryptjs');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const FIRST_NAMES = [
  'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda',
  'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica',
  'Thomas', 'Sarah', 'Charles', 'Karen', 'Christopher', 'Nancy', 'Daniel', 'Lisa',
  'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra', 'Donald', 'Ashley',
  'Steven', 'Kimberly', 'Paul', 'Emily', 'Andrew', 'Donna', 'Joshua', 'Michelle',
  'Kevin', 'Carol', 'Brian', 'Amanda', 'George', 'Dorothy', 'Timothy', 'Melissa',
  'Ronald', 'Deborah', 'Jason', 'Stephanie', 'Edward', 'Rebecca', 'Jeffrey', 'Sharon',
  'Ryan', 'Laura', 'Jacob', 'Cynthia', 'Gary', 'Kathleen', 'Nicholas', 'Amy',
  'Eric', 'Angela', 'Jonathan', 'Shirley', 'Stephen', 'Anna', 'Larry', 'Brenda',
  'Justin', 'Pamela', 'Scott', 'Emma', 'Brandon', 'Nicole', 'Benjamin', 'Helen',
  'Samuel', 'Samantha', 'Gregory', 'Katherine', 'Alexander', 'Christine', 'Patrick', 'Debra',
  'Frank', 'Rachel', 'Raymond', 'Carolyn', 'Jack', 'Janet', 'Dennis', 'Maria',
  'Jerry', 'Olivia', 'Tyler', 'Heather', 'Aaron', 'Diane', 'Jose', 'Julie',
  'Adam', 'Joyce', 'Nathan', 'Victoria', 'Henry', 'Ruth', 'Zachary', 'Virginia',
  'Douglas', 'Lauren', 'Peter', 'Kelly', 'Kyle', 'Christina', 'Noah', 'Joan',
  'Ethan', 'Evelyn', 'Jeremy', 'Judith', 'Walter', 'Andrea', 'Christian', 'Hannah',
  'Keith', 'Megan', 'Roger', 'Cheryl', 'Terry', 'Jacqueline', 'Austin', 'Martha',
  'Sean', 'Madison', 'Gerald', 'Teresa', 'Carl', 'Gloria', 'Harold', 'Sara',
  'Dylan', 'Janice', 'Arthur', 'Ann', 'Lawrence', 'Abigail', 'Jordan', 'Sophia',
  'Jesse', 'Frances', 'Bryan', 'Jean', 'Billy', 'Alice', 'Bruce', 'Judy',
  'Gabriel', 'Isabella', 'Logan', 'Julia', 'Alan', 'Grace', 'Juan', 'Amber',
  'Wayne', 'Denise', 'Ralph', 'Danielle', 'Roy', 'Marilyn', 'Eugene', 'Beverly',
  'Louis', 'Charlotte', 'Philip', 'Natalie', 'Bobby', 'Theresa', 'Johnny', 'Diana',
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas',
  'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White',
  'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young',
  'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
  'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell',
  'Carter', 'Roberts', 'Gomez', 'Phillips', 'Evans', 'Turner', 'Diaz', 'Parker',
  'Cruz', 'Edwards', 'Collins', 'Reyes', 'Stewart', 'Morris', 'Morales', 'Murphy',
  'Cook', 'Rogers', 'Gutierrez', 'Ortiz', 'Morgan', 'Cooper', 'Peterson', 'Bailey',
  'Reed', 'Kelly', 'Howard', 'Ramos', 'Kim', 'Cox', 'Ward', 'Richardson',
  'Watson', 'Brooks', 'Chavez', 'Wood', 'James', 'Bennett', 'Gray', 'Mendoza',
  'Ruiz', 'Hughes', 'Price', 'Alvarez', 'Castillo', 'Sanders', 'Patel', 'Myers',
  'Long', 'Ross', 'Foster', 'Jimenez', 'Powell', 'Jenkins', 'Perry', 'Russell',
  'Sullivan', 'Bell', 'Coleman', 'Butler', 'Henderson', 'Barnes', 'Gonzales', 'Fisher',
  'Vasquez', 'Simmons', 'Romero', 'Jordan', 'Patterson', 'Alexander', 'Hamilton', 'Graham',
  'Reynolds', 'Griffin', 'Wallace', 'Moreno', 'West', 'Cole', 'Hayes', 'Bryant',
  'Herrera', 'Gibson', 'Ellis', 'Tran', 'Medina', 'Aguilar', 'Stevens', 'Murray',
  'Ford', 'Castro', 'Marshall', 'Owens', 'Harrison', 'Fernandez', 'Mcdonald', 'Woods',
];

const CHURCHES = [
  { slug: 'newlife', name: 'New Life', target: 200 },
  { slug: 'mount-horeb', name: 'Mount Horeb', target: 600 },
  { slug: 'kiserian-dam', name: 'Kiserian Dam', target: 1500 },
];

const DEPARTMENTS = [
  { name: 'Children', slug: 'children' },
  { name: 'Youth', slug: 'youth' },
  { name: 'Women', slug: 'women' },
  { name: 'Men', slug: 'men' },
  { name: 'Choir', slug: 'choir' },
  { name: 'Ushering', slug: 'ushering' },
  { name: 'Prayer', slug: 'prayer' },
  { name: 'Evangelism', slug: 'evangelism' },
  { name: 'Health', slug: 'health' },
  { name: 'Education', slug: 'education' },
];

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(start, end) {
  const d = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return d.toISOString().slice(0, 10);
}

function ageGroup(dateOfBirth) {
  const dob = new Date(dateOfBirth);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  if (age <= 12) return 'child';
  if (age <= 25) return 'youth';
  if (age <= 60) return 'adult';
  return 'senior';
}

function departmentFor(age, gender) {
  if (age === 'child') return 'children';
  if (age === 'youth') return 'youth';
  if (age === 'adult') {
    const pool = gender === 'female' ? ['women', 'choir', 'ushering', 'prayer', 'health', 'education'] : ['men', 'choir', 'ushering', 'prayer', 'evangelism', 'health', 'education'];
    return randomItem(pool);
  }
  return randomItem(['prayer', 'health']);
}

async function main() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    database: process.env.DB_NAME || 'cms_db',
    password: process.env.DB_PASSWORD,
  });
  await client.connect();

  // Ensure department_members has member_id and churches.slug is unique
  await client.query(`
    ALTER TABLE department_members
    ADD COLUMN IF NOT EXISTS member_id UUID,
    ADD COLUMN IF NOT EXISTS requested_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  `);
  await client.query('CREATE UNIQUE INDEX IF NOT EXISTS churches_slug_key ON churches(slug)');
  await client.query('CREATE UNIQUE INDEX IF NOT EXISTS departments_slug_church_key ON departments(slug, church_id)');
  await client.query('CREATE UNIQUE INDEX IF NOT EXISTS department_members_user_dept_key ON department_members(user_id, department_id)');

  const passwordHash = bcrypt.hashSync('right123', 10);
  const memberRole = await client.query("SELECT id FROM roles WHERE name = 'Member'");
  const memberRoleId = memberRole.rows[0] && memberRole.rows[0].id;

  for (const church of CHURCHES) {
    const churchRes = await client.query(
      `INSERT INTO churches (name, slug, is_active, subscription_tier, billing_cycle)
       VALUES ($1, $2, true, 'free', 'monthly')
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, is_active = true
       RETURNING id`,
      [church.name, church.slug]
    );
    const churchId = churchRes.rows[0].id;
    console.log(`\n=== ${church.name} (${church.slug}) target ${church.target} ===`);

    // Departments
    const deptMap = {};
    for (const dept of DEPARTMENTS) {
      const res = await client.query(
        `INSERT INTO departments (name, slug, church_id, is_active)
         VALUES ($1, $2, $3, true)
         ON CONFLICT (slug, church_id) DO UPDATE SET name = EXCLUDED.name, is_active = true
         RETURNING id`,
        [dept.name, dept.slug, churchId]
      );
      deptMap[dept.slug] = res.rows[0].id;
    }

    // Age distribution
    const total = church.target;
    const children = Math.round(total * 0.25);
    const youth = Math.round(total * 0.25);
    const adults = Math.round(total * 0.35);
    const seniors = total - children - youth - adults;

    const usersData = [];
    const membersData = [];
    let counter = 0;

    const addMember = (age) => {
      counter += 1;
      const gender = Math.random() < 0.52 ? 'female' : 'male';
      const firstName = randomItem(FIRST_NAMES);
      const lastName = randomItem(LAST_NAMES);
      const email = `member${counter}@${church.slug}.com`;
      const username = `member${counter}@${church.slug}.com`;
      const phone = `+2547${String(randomInt(10000000, 99999999))}`;

      let dob;
      if (age === 'child') dob = randomDate(new Date(2014, 0, 1), new Date(2026, 0, 1));
      else if (age === 'youth') dob = randomDate(new Date(2001, 0, 1), new Date(2013, 11, 31));
      else if (age === 'adult') dob = randomDate(new Date(1966, 0, 1), new Date(2000, 11, 31));
      else dob = randomDate(new Date(1950, 0, 1), new Date(1965, 11, 31));

      const membershipStatus = 'active';
      const maritalStatus = age === 'adult' || age === 'senior' ? randomItem(['single', 'married', 'widowed', 'divorced']) : 'single';
      const occupation = age === 'adult' || age === 'senior' ? randomItem(['Teacher', 'Nurse', 'Engineer', 'Farmer', 'Business', 'Student', 'Retired', 'Driver', 'Chef', 'Accountant']) : 'Student';
      const joinedDate = randomDate(new Date(2020, 0, 1), new Date());
      const baptismDate = age !== 'child' && Math.random() < 0.6 ? randomDate(new Date(2010, 0, 1), new Date()) : null;
      const membershipNumber = `${church.slug.slice(0, 2).toUpperCase()}-${String(counter).padStart(4, '0')}`;

      usersData.push({ email, username, firstName, lastName, phone, churchId });
      membersData.push({
        firstName, lastName, email, phone, membershipStatus, joinedDate, baptismDate,
        dateOfBirth: dob, gender, maritalStatus, occupation, churchId, membershipNumber,
      });
    };

    for (let i = 0; i < children; i++) addMember('child');
    for (let i = 0; i < youth; i++) addMember('youth');
    for (let i = 0; i < adults; i++) addMember('adult');
    for (let i = 0; i < seniors; i++) addMember('senior');

    // Bulk insert users
    const userEmails = usersData.map(u => u.email);
    const userUsernames = usersData.map(u => u.username);
    const userFirstNames = usersData.map(u => u.firstName);
    const userLastNames = usersData.map(u => u.lastName);
    const userPhones = usersData.map(u => u.phone);
    const userChurchIds = usersData.map(u => u.churchId);

    const usersRes = await client.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, username, phone_number, phone, is_active, church_id, slug, church_slug)
       SELECT email, $1, first_name, last_name, username, phone_number, phone_number, true, church_id, username, $2
       FROM unnest($3::text[], $4::text[], $5::text[], $6::text[], $7::text[], $8::uuid[])
       AS t(email, first_name, last_name, username, phone_number, church_id)
       RETURNING id, email`,
      [passwordHash, church.slug, userEmails, userFirstNames, userLastNames, userUsernames, userPhones, userChurchIds]
    );
    const userIdByEmail = {};
    usersRes.rows.forEach(r => { userIdByEmail[r.email] = r.id; });
    console.log(`  users inserted: ${usersRes.rows.length}`);

    // Bulk insert members
    const memberUserIds = membersData.map(m => userIdByEmail[m.email]);
    const memberFirstNames = membersData.map(m => m.firstName);
    const memberLastNames = membersData.map(m => m.lastName);
    const memberEmails = membersData.map(m => m.email);
    const memberPhones = membersData.map(m => m.phone);
    const memberStatuses = membersData.map(m => m.membershipStatus);
    const memberJoined = membersData.map(m => m.joinedDate);
    const memberBaptism = membersData.map(m => m.baptismDate);
    const memberDob = membersData.map(m => m.dateOfBirth);
    const memberGender = membersData.map(m => m.gender);
    const memberMarital = membersData.map(m => m.maritalStatus);
    const memberOccupation = membersData.map(m => m.occupation);
    const memberChurchIds = membersData.map(m => m.churchId);
    const memberNumbers = membersData.map(m => m.membershipNumber);

    const membersRes = await client.query(
      `INSERT INTO members (user_id, first_name, last_name, email, phone, membership_status, joined_date, baptism_date, date_of_birth, gender, marital_status, occupation, church_id, membership_number)
       SELECT user_id, first_name, last_name, email, phone, membership_status, joined_date, baptism_date, date_of_birth, gender, marital_status, occupation, church_id, membership_number
       FROM unnest($1::uuid[], $2::text[], $3::text[], $4::text[], $5::text[], $6::text[], $7::date[], $8::date[], $9::date[], $10::text[], $11::text[], $12::text[], $13::uuid[], $14::text[])
       AS t(user_id, first_name, last_name, email, phone, membership_status, joined_date, baptism_date, date_of_birth, gender, marital_status, occupation, church_id, membership_number)
       RETURNING id, user_id`,
      [memberUserIds, memberFirstNames, memberLastNames, memberEmails, memberPhones, memberStatuses, memberJoined, memberBaptism, memberDob, memberGender, memberMarital, memberOccupation, memberChurchIds, memberNumbers]
    );
    const memberIdByUserId = {};
    membersRes.rows.forEach(r => { memberIdByUserId[r.user_id] = r.id; });
    console.log(`  members inserted: ${membersRes.rows.length}`);

    // Assign Member role to users
    if (memberRoleId) {
      await client.query(
        `INSERT INTO user_roles (user_id, role_id)
         SELECT u.id, $1
         FROM users u
         WHERE u.church_id = $2
         ON CONFLICT (user_id, role_id) DO NOTHING`,
        [memberRoleId, churchId]
      );
    }

    // Assign members to departments
    const deptUserIds = [];
    const deptMemberIds = [];
    const deptIds = [];
    const deptRoles = [];
    const deptRoleInDept = [];
    const deptStatus = [];
    const deptChurchIds = [];

    membersData.forEach(m => {
      const userId = userIdByEmail[m.email];
      const memberId = memberIdByUserId[userId];
      const age = ageGroup(m.dateOfBirth);
      const deptSlug = departmentFor(age, m.gender);
      const deptId = deptMap[deptSlug];
      if (userId && memberId && deptId) {
        deptUserIds.push(userId);
        deptMemberIds.push(memberId);
        deptIds.push(deptId);
        deptRoles.push('Member');
        deptRoleInDept.push('Member');
        deptStatus.push('active');
        deptChurchIds.push(churchId);
      }
    });

    await client.query(
      `INSERT INTO department_members (user_id, member_id, department_id, role, role_in_department, status, is_active, joined_at, church_id)
       SELECT user_id, member_id, department_id, role, role_in_department, status, true, CURRENT_TIMESTAMP, church_id
       FROM unnest($1::uuid[], $2::uuid[], $3::uuid[], $4::text[], $5::text[], $6::text[], $7::uuid[])
       AS t(user_id, member_id, department_id, role, role_in_department, status, church_id)
       ON CONFLICT (user_id, department_id) DO NOTHING`,
      [deptUserIds, deptMemberIds, deptIds, deptRoles, deptRoleInDept, deptStatus, deptChurchIds]
    );
    console.log(`  department_members inserted: ${deptUserIds.length}`);
  }

  const counts = await client.query(`
    SELECT c.slug, c.name, COUNT(m.id) AS members
    FROM churches c
    LEFT JOIN members m ON m.church_id = c.id
    WHERE c.slug IN ('newlife', 'mount-horeb', 'kiserian-dam')
    GROUP BY c.slug, c.name
    ORDER BY c.slug
  `);
  console.log('\nFinal counts:');
  counts.rows.forEach(r => console.log(`  ${r.slug}: ${r.members}`));

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
