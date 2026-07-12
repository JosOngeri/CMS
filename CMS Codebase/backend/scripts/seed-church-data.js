require('dotenv').config();
const fs = require('fs');
const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');

const WORKERS_FILE = 'D:\\\\VIbeCode\\\\KMainCMS\\\\Church workers List with departments.txt';
const EMAIL_DOMAIN = 'kmaincms.org';
const EMAIL_PREFIX = 'kmainseed+';
const DEFAULT_PASSWORD = 'Welcome123!';
const ADULT_COUNT = 300;
const CHILD_COUNT = 250;

const firstNames = [
  'John', 'Mary', 'George', 'Grace', 'Stephen', 'Elizabeth', 'Samuel', 'Ruth',
  'Peter', 'Alice', 'James', 'Jane', 'Moses', 'Lucy', 'Paul', 'Sarah',
  'Thomas', 'Esther', 'David', 'Martha', 'Daniel', 'Lilian', 'Joseph', 'Catherine', 'Joash'
];

const genders = [
  'Male', 'Female', 'Male', 'Female', 'Male', 'Female', 'Male', 'Female',
  'Male', 'Female', 'Male', 'Female', 'Male', 'Female', 'Male', 'Female',
  'Male', 'Female', 'Male', 'Female', 'Male', 'Female', 'Male', 'Female', 'Male'
];

const lastNames = [
  "Ng'ang'a", 'Monda', 'Karongo', 'Onchogo', 'Khamala', 'Gichinga', 'Mokua', 'Gitonga',
  'Onyancha', 'Mogesa', 'Ruuge', 'Onchari', 'Omae', 'Kuraru', 'Amalemba', 'Ongeri',
  'Wachira', 'Mokaya', 'Mbatia', 'Auka', 'Mboya', 'Maoro', 'Karimi', 'Ogato', 'Momanyi'
];

const cities = ['Kiserian', 'Oloirien', 'Nkarusha', 'Nairobi', 'Kajiado', 'Ngong', 'Rongai', 'Karen', 'Langata', 'Athi River'];
const addresses = ['P.O. Box 123', 'Kiserian Town', 'Oloirien Village', 'Nkarusha Area', 'Ngong Road', 'Nairobi West', 'Kajiado Town', 'Rongai Estate', 'Karen Langata', 'Matasia Area'];
const occupations = ['Teacher', 'Engineer', 'Nurse', 'Business', 'Farmer', 'Student', 'Driver', 'Carpenter', 'Doctor', 'Lecturer', 'Accountant', 'Pastor', 'Retired', 'Entrepreneur', 'Software Developer', 'Mechanic', 'Police Officer', 'Soldier', 'Clerk', 'Trader'];
const maritalStatuses = ['Single', 'Married', 'Widowed', 'Divorced', 'Separated'];
const notificationTemplates = [
  { type: 'welcome', title: 'Welcome to Kiserian Main SDA', body: 'We are glad you are part of our church family.' },
  { type: 'reminder', title: 'Sabbath Service Reminder', body: 'Join us for Sabbath service tomorrow at 9:00 AM.' },
  { type: 'prayer', title: 'Weekly Prayer Request', body: 'Please keep the church family in your prayers this week.' },
  { type: 'event', title: 'Upcoming Church Event', body: 'There is a fellowship event coming up soon. Details will be shared.' },
  { type: 'announcement', title: 'Announcement', body: 'New announcement from the church leadership.' }
];
const smsMessages = [
  'Welcome to Kiserian Main SDA Church.',
  'Sabbath service tomorrow at 9:00 AM.',
  'Prayer meeting this Wednesday at 6:00 PM.',
  'Youth fellowship this Saturday at 4:00 PM.',
  'Reminder: Church board meeting on Monday.',
  'God bless you and your family this week.'
];

function normalizeText(raw) {
  return raw
    .replace(/’/g, "'")
    .replace(/–/g, ' - ')
    .replace(/—/g, ' - ')
    .replace(/“|”/g, '"')
    .trim();
}

function isAllCaps(line) {
  return /^[A-Z][A-Z\s&./'’()\-]*$/u.test(line) && line.length > 1;
}

function removeBullet(raw) {
  return raw.replace(/^\s*[\d\.a-z)\]\-]+\s*/, '').trim();
}

function cleanTitle(name) {
  return name
    .replace(/^(Mr\.?\s+and\s+Mrs\.?\s+|Mr\.?\s+|Mrs\.?\s+|Ms\.?\s+|Dr\.?\s+)/i, '')
    .replace(/[,;]$/, '')
    .trim();
}

const knownRoles = new Set([
  '1st elder', '2nd elder', 'elder', 'head', 'leader', 'director', 'assistant', 'assistants',
  'secretary', 'assistant secretaries', 'sponsor', 'sponsors', 'chair', 'chairperson',
  'coordinator', 'co-ordinator', 'music leader', 'division leader', 'member',
  'prayer coordinator', 'footprint for parents', 'footprints for children'
]);

function normalizeRole(role) {
  const r = role ? role.toLowerCase().trim() : '';
  if (r === 'assistants') return 'Assistant';
  if (r === 'sponsors') return 'Sponsor';
  if (r === 'assistant secretaries') return 'Assistant Secretary';
  if (r === 'co-ordinator') return 'Coordinator';
  return role ? role.trim() : 'Member';
}

function isLocation(s) {
  return s && (s.toLowerCase() === 'nkarusha' || s.toLowerCase() === 'oloirien');
}

function isQuote(s) {
  return s && (s.startsWith('"') || s === "''" || s === '' || s.trim() === '');
}

function sectionRole(name) {
  const n = name.toUpperCase();
  if (n === 'ELDERS') return 'Elder';
  if (n === 'DEACONS') return 'Deacon';
  if (n === 'DEACONESSES') return 'Deaconess';
  return 'Member';
}

function getHeadRole(name) {
  const n = name.toUpperCase();
  if (n.includes('DIRECTOR') || n === 'CHURCH CHOIR' || n === 'ADVENTURER CLUB' || n === 'PATHFINDER' || n === 'PERSONAL MINISTRY' || n === 'PUBLISHING DIRECTOR') return 'Director';
  if (n.includes('TREASURER')) return 'Treasurer';
  if (n.includes('CLERK')) return 'Clerk';
  if (n.includes('SECRETARY')) return 'Secretary';
  if (n.includes('CO-ORDINATOR') || n.includes('COORDINATOR')) return 'Coordinator';
  if (n.includes('SUPERINTENDENT')) return 'Superintendent';
  if (n === 'SCHOOL CHAIR') return 'Chair';
  if (n === 'CAMP MEETING') return 'Chairperson';
  if (n === 'ELDERS') return 'Elder';
  if (n.includes('DEACON')) return 'Head';
  if (n === 'CHURCH BOARD MEMBERS') return 'Member';
  if (n === 'CHORISTERS') return 'Member';
  return 'Leader';
}

function getDeptCategory(name) {
  const n = name.toUpperCase();
  if (n === 'ELDERS' || n.includes('DEACON') || n === 'TREASURER' || n === 'CHURCH CLERK' || n === 'CHURCH BOARD MEMBERS' || n === 'STEWARDSHIP LEADER' || n === 'RELIGIOUS LIBERTY LEADER') return 'Leadership';
  if (n === 'EDUCATION SECRETARY' || n === 'SABBATH SCHOOL SUPERINTENDENT' || n === 'SCHOOL CHAIR' || n === 'LIBRARIAN' || n.includes('V.O.P')) return 'Education';
  if (n === 'YOUTH MINISTRY' || n === 'ADVENTURER CLUB' || n === 'PATHFINDER' || n === 'AMBASSADORS' || n === 'VBS' || n === 'CHILDREN MINISTRY' || n.includes('KID') || n === 'MASTER GUIDE') return 'Youth';
  if (n === 'MUSIC CO-ORDINATOR' || n === 'CHURCH CHOIR' || n === 'CHORISTERS' || n === 'PIANIST' || n === 'PA SYSTEM') return 'Worship';
  if (n === 'COMMUNICATION SECRETARY' || n === 'INTEREST COORDINATOR') return 'Support';
  if (n === 'CAMP MEETING' || n === 'A.M.R.') return 'Special';
  return 'Ministry';
}

function getFinalRole(memberRole, headRole) {
  if (headRole && (memberRole === 'Member' || memberRole === 'Leader')) return headRole;
  return memberRole;
}

function parseName(fullName) {
  const cleaned = cleanTitle(fullName);
  const parts = cleaned.split(/\s+/).filter(p => p);
  if (parts.length === 0) return { first_name: 'Unknown', last_name: 'Unknown' };
  if (parts.length === 1) return { first_name: parts[0], last_name: 'Unknown' };
  return { first_name: parts[0], last_name: parts.slice(1).join(' ') };
}

function parseWorkersFile() {
  const text = fs.readFileSync(WORKERS_FILE, 'utf8');
  const lines = text.split(/\r?\n/);
  const sections = [];
  let current = null;
  let previousMain = null;
  let currentRole = null;
  let currentLocation = null;
  let pendingRole = null;

  const peopleMap = new Map();

  function getPerson(name) {
    const key = name.trim();
    if (!peopleMap.has(key)) {
      const { first_name, last_name } = parseName(key);
      peopleMap.set(key, {
        name: key,
        first_name,
        last_name,
        assignments: [],
        roles: new Set(['Member']),
        isHead: false,
        userRole: 'Member'
      });
    }
    return peopleMap.get(key);
  }

  for (let raw of lines) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('*') || trimmed.toLowerCase().includes('elders to appoint')) continue;

    let cleaned = removeBullet(raw);
    if (!cleaned) continue;
    let normalized = normalizeText(cleaned);

    if (/^KID\s+/i.test(normalized) && !isAllCaps(normalized)) {
      if (normalized.toLowerCase().includes('prayer')) pendingRole = 'Prayer Coordinator';
      else if (normalized.toLowerCase().includes('footprint for parents')) pendingRole = 'Footprint for Parents';
      else if (normalized.toLowerCase().includes('footprints for children')) pendingRole = 'Footprints for Children';
      continue;
    }

    if (isAllCaps(normalized) || /^KID\s+-\s+[A-Z]/u.test(normalized)) {
      if (normalized === 'ASSISTANTS' && previousMain) {
        current = sections.find(s => s.name === previousMain);
        if (current) {
          current.sectionRole = 'Assistant';
          currentRole = 'Assistant';
        }
        continue;
      }

      current = { name: normalized, head: null, members: [], sectionRole: sectionRole(normalized) };
      previousMain = normalized;
      sections.push(current);
      currentRole = current.sectionRole;
      currentLocation = null;
      continue;
    }

    if (!current) continue;

    normalized = cleanTitle(normalized);
    if (!normalized || normalized.length < 3) continue;
    if (normalized.toLowerCase() === 'chair' || normalized.toLowerCase() === 'assistant') continue;

    const isBullet = /^[-]\s+/.test(raw);
    const parts = normalized.split(/\s+-\s+|\s*-\s*/).map(p => p.trim()).filter(p => p);

    let role = null;
    let name = null;
    let location = null;

    if (parts.length >= 2) {
      const left = parts[0].toLowerCase();
      const right = parts[1].toLowerCase();
      const rest = parts.length > 2 ? parts[2] : null;

      if (knownRoles.has(left)) {
        role = normalizeRole(parts[0]);
        name = parts.slice(1).join(' - ');
      } else if (knownRoles.has(right)) {
        name = parts[0];
        role = normalizeRole(parts[1]);
        if (parts.length > 2) {
          if (isLocation(parts[2])) location = parts[2];
          else if (isQuote(parts[2])) location = currentLocation;
        }
      } else if (isQuote(right)) {
        name = parts[0];
        role = currentRole;
        if (parts.length > 2) {
          if (isLocation(parts[2])) location = parts[2];
          else if (isQuote(parts[2])) location = currentLocation;
        }
      } else if (isLocation(right)) {
        name = parts[0];
        role = isBullet ? currentRole : (current.sectionRole || 'Member');
        location = parts[1];
      } else if (rest && isLocation(rest)) {
        name = parts[0];
        role = normalizeRole(parts[1]);
        location = parts[2];
      } else {
        name = parts[0];
        role = normalizeRole(parts[1]);
      }
    } else {
      name = normalized;
      if (isBullet) role = currentRole;
      else role = current.sectionRole || 'Member';
    }

    if (pendingRole) {
      role = pendingRole;
      pendingRole = null;
    }

    name = cleanTitle(name);
    if (!name || name.length < 2) continue;

    if (role) {
      role = normalizeRole(role);
      if (role === 'Assistant') currentRole = 'Assistant';
      else currentRole = role;
    }
    if (location) currentLocation = location;

    if (!current.head) current.head = name;
    if (!current.members.find(m => m.name === name)) {
      current.members.push({ name, role: role || 'Member', location });
    }
  }

  // Build people assignments and roles
  for (const section of sections) {
    const headRole = getHeadRole(section.name);
    for (const member of section.members) {
      const person = getPerson(member.name);
      const isHead = member.name === section.head;
      const finalRole = getFinalRole(member.role, isHead ? headRole : null);

      person.assignments.push({
        departmentName: section.name,
        role: finalRole,
        location: member.location
      });

      if (isHead) {
        person.isHead = true;
        person.roles.add('Department Head');
      }

      if (section.name === 'ELDERS') {
        person.roles.add('Elder');
        if (member.role === '1st Elder') person.roles.add('First Elder');
      }
      if (section.name === 'DEACONS') person.roles.add('Deacon');
      if (section.name === 'DEACONESSES') person.roles.add('Deaconess');
      if (section.name === 'TREASURER' && isHead) person.roles.add('Treasurer');
      if (section.name === 'CHURCH CLERK' && isHead) person.roles.add('Clerk');
    }
  }

  // Determine user role column
  const rolePriority = ['Department Head', 'First Elder', 'Elder', 'Treasurer', 'Clerk', 'Deacon', 'Deaconess', 'Child', 'Member'];
  for (const person of peopleMap.values()) {
    for (const r of rolePriority) {
      if (person.roles.has(r)) {
        person.userRole = r;
        break;
      }
    }
  }

  return { sections, people: Array.from(peopleMap.values()) };
}

function safeName(str) {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDateBetween(startYears, endYears) {
  const now = Date.now();
  const start = now - startYears * 365 * 24 * 60 * 60 * 1000;
  const end = now - endYears * 365 * 24 * 60 * 60 * 1000;
  return new Date(start + Math.random() * (end - start)).toISOString();
}

function makePhone(idx) {
  return '+2547' + String(100000000 + idx).slice(1);
}

function generatePerson({ idx, isChild, firstName, lastName, gender, city, role, roles, userRole, assignments, isHead }) {
  const safeFirst = safeName(firstName);
  const safeLast = safeName(lastName);
  const email = `${EMAIL_PREFIX}${isChild ? 'child.' : ''}${safeFirst}.${safeLast}.${idx}@${EMAIL_DOMAIN}`;
  const username = `${isChild ? 'child' : ''}${safeFirst}${safeLast}${idx}`;

  let dob, joinedDate, baptismDate, maritalStatus, occupation;
  if (isChild) {
    dob = randomDateBetween(17, 0);
    joinedDate = randomDateBetween(3, 0);
    baptismDate = null;
    maritalStatus = 'Single';
    occupation = 'Student';
  } else {
    dob = randomDateBetween(70, 18);
    joinedDate = randomDateBetween(25, 1);
    baptismDate = randomDateBetween(30, 1);
    maritalStatus = randomChoice(maritalStatuses);
    occupation = randomChoice(occupations);
  }

  return {
    idx,
    first_name: firstName,
    last_name: lastName,
    email,
    username,
    phone: makePhone(idx),
    gender,
    date_of_birth: dob,
    joined_date: joinedDate,
    baptism_date: baptismDate,
    marital_status: maritalStatus,
    occupation,
    city: city || randomChoice(cities),
    address: randomChoice(addresses),
    notes: isChild ? null : `Generated member record`,
    role,
    roles,
    userRole,
    assignments: assignments || [],
    isHead
  };
}

function generateAdults(count, startIdx) {
  const list = [];
  for (let i = 0; i < count; i++) {
    const idx = startIdx + i;
    const firstName = firstNames[idx % firstNames.length];
    const lastName = lastNames[Math.floor(idx / firstNames.length) % lastNames.length];
    const gender = genders[idx % firstNames.length];
    list.push(generatePerson({
      idx,
      isChild: false,
      firstName,
      lastName,
      gender,
      city: randomChoice(cities),
      role: 'Member',
      roles: new Set(['Member']),
      userRole: 'Member',
      assignments: [],
      isHead: false
    }));
  }
  return list;
}

function generateChildren(count, startIdx) {
  const list = [];
  for (let i = 0; i < count; i++) {
    const idx = startIdx + i;
    const firstName = firstNames[idx % firstNames.length];
    const lastName = lastNames[Math.floor(idx / firstNames.length) % lastNames.length];
    const gender = genders[idx % firstNames.length];
    list.push(generatePerson({
      idx,
      isChild: true,
      firstName,
      lastName,
      gender,
      city: randomChoice(cities),
      role: 'Child',
      roles: new Set(['Child', 'Member']),
      userRole: 'Child',
      assignments: [],
      isHead: false
    }));
  }
  return list;
}

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function seed() {
  const client = await pool.connect();
  try {
    console.log('Starting seeding...');
    await client.query('BEGIN');

    const passwordHash = bcrypt.hashSync(DEFAULT_PASSWORD, 8);

    const churchRes = await client.query('SELECT id FROM churches ORDER BY created_at LIMIT 1');
    if (!churchRes.rows.length) throw new Error('No church found');
    const churchId = churchRes.rows[0].id;

    const adminRes = await client.query("SELECT id FROM users WHERE email = 'admin@kiseriansda.org' OR email = 'admin@kmaincms.org' ORDER BY created_at LIMIT 1");
    const adminId = adminRes.rows[0]?.id;

    // Ensure extra roles exist
    await client.query(`
      INSERT INTO roles (name, description) VALUES
      ('Deacon', 'Deacon role'),
      ('Deaconess', 'Deaconess role'),
      ('Child', 'Child member')
      ON CONFLICT (name) DO NOTHING
    `);

    const rolesRes = await client.query('SELECT id, name FROM roles');
    const roleIds = {};
    for (const r of rolesRes.rows) roleIds[r.name] = r.id;

    const { sections, people } = parseWorkersFile();
    const fileCount = people.length;
    const extraAdults = Math.max(0, ADULT_COUNT - fileCount);

    const generatedAdults = generateAdults(extraAdults, fileCount);
    const children = generateChildren(CHILD_COUNT, fileCount + extraAdults);
    const allMembers = [...people, ...generatedAdults, ...children];

    // Set file person details
    for (let i = 0; i < people.length; i++) {
      const person = people[i];
      const location = person.assignments.find(a => a.location)?.location;
      const safeFirst = safeName(person.first_name);
      const safeLast = safeName(person.last_name);
      person.idx = i;
      person.email = `${EMAIL_PREFIX}${safeFirst}.${safeLast}.${i}@${EMAIL_DOMAIN}`;
      person.username = `${safeFirst}${safeLast}${i}`;
      person.phone = makePhone(i);
      person.gender = randomChoice(['Male', 'Female']);
      person.date_of_birth = randomDateBetween(70, 18);
      person.joined_date = randomDateBetween(25, 1);
      person.baptism_date = randomDateBetween(30, 1);
      person.marital_status = randomChoice(maritalStatuses);
      person.occupation = randomChoice(occupations);
      person.city = location || randomChoice(cities);
      person.address = randomChoice(addresses);
      person.notes = null;
    }

    // Delete existing seed data for idempotency
    const seedEmailPattern = `${EMAIL_PREFIX}%@${EMAIL_DOMAIN}`;
    await client.query(`DELETE FROM members WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1)`, [seedEmailPattern]);
    await client.query(`DELETE FROM department_members WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1)`, [seedEmailPattern]);
    await client.query(`DELETE FROM notifications WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1)`, [seedEmailPattern]);
    await client.query(`DELETE FROM sms_logs WHERE recipient_phone IN (SELECT phone FROM users WHERE email LIKE $1)`, [seedEmailPattern]);

    console.log(`Creating ${allMembers.length} users...`);
    const idByEmail = {};
    const idByName = {};

    for (const person of allMembers) {
      const userRes = await client.query(
        `INSERT INTO users (email, password_hash, username, first_name, last_name, phone, phone_number, slug, role, is_active, email_verified, mfa_enabled, church_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, true, false, $10)
         ON CONFLICT (email) DO UPDATE SET updated_at = NOW()
         RETURNING id, email`,
        [person.email, passwordHash, person.username, person.first_name, person.last_name, person.phone, person.phone, person.username, person.userRole, churchId]
      );
      person.userId = userRes.rows[0].id;
      idByEmail[person.email] = person.userId;
      idByName[`${person.first_name} ${person.last_name}`] = person.userId;
    }

    console.log('Creating member records...');
    for (const person of allMembers) {
      await client.query(
        `INSERT INTO members (user_id, first_name, last_name, email, phone, membership_status, joined_date, baptism_date, date_of_birth, gender, marital_status, occupation, address, city, notes, church_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
        [person.userId, person.first_name, person.last_name, person.email, person.phone, 'active', person.joined_date, person.baptism_date, person.date_of_birth, person.gender, person.marital_status, person.occupation, person.address, person.city, person.notes, churchId]
      );
    }

    console.log('Creating departments...');
    const deptIdByName = {};
    for (const section of sections) {
      if (section.members.length === 0 || !section.head) continue;
      const headPerson = people.find(p => p.name === section.head);
      const leaderName = headPerson ? `${headPerson.first_name} ${headPerson.last_name}` : section.head;
      const deptRes = await client.query(
        `INSERT INTO departments (name, description, head_id, slug, is_active, church_id, category, leader_name)
         VALUES ($1, $2, NULL, $3, true, $4, $5, $6)
         ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description, slug = EXCLUDED.slug, is_active = EXCLUDED.is_active, church_id = EXCLUDED.church_id, category = EXCLUDED.category, leader_name = EXCLUDED.leader_name
         RETURNING id, name`,
        [section.name, `${getDeptCategory(section.name)} department of Kiserian Main SDA Church`, slugify(section.name), churchId, getDeptCategory(section.name), leaderName]
      );
      deptIdByName[section.name] = deptRes.rows[0].id;
    }

    // Update department heads
    for (const section of sections) {
      if (!section.head || !deptIdByName[section.name]) continue;
      const headPerson = people.find(p => p.name === section.head);
      if (headPerson && headPerson.userId) {
        await client.query('UPDATE departments SET head_id = $1 WHERE id = $2', [headPerson.userId, deptIdByName[section.name]]);
      }
    }

    console.log('Creating department memberships...');
    for (const section of sections) {
      if (!deptIdByName[section.name]) continue;
      const deptId = deptIdByName[section.name];
      const headRole = getHeadRole(section.name);
      for (const member of section.members) {
        const person = people.find(p => p.name === member.name);
        if (!person || !person.userId) continue;
        const isHead = member.name === section.head;
        const finalRole = getFinalRole(member.role, isHead ? headRole : null);
        const joined = randomDateBetween(5, 0);
        await client.query(
          `INSERT INTO department_members (user_id, department_id, role, role_in_department, status, is_active, joined_at, requested_at, approved_at, approved_by, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           ON CONFLICT (user_id, department_id) DO UPDATE SET role = EXCLUDED.role, role_in_department = EXCLUDED.role_in_department, status = EXCLUDED.status, is_active = EXCLUDED.is_active, joined_at = EXCLUDED.joined_at, requested_at = EXCLUDED.requested_at, approved_at = EXCLUDED.approved_at, approved_by = EXCLUDED.approved_by, updated_at = EXCLUDED.updated_at`,
          [person.userId, deptId, finalRole, finalRole, 'approved', true, joined, joined, joined, adminId, joined]
        );
      }
    }

    console.log('Assigning user roles...');
    for (const person of allMembers) {
      for (const roleName of person.roles) {
        if (!roleIds[roleName]) continue;
        await client.query(
          'INSERT INTO user_roles (user_id, role_id, church_id) VALUES ($1, $2, $3) ON CONFLICT (user_id, role_id) DO NOTHING',
          [person.userId, roleIds[roleName], churchId]
        );
      }
    }

    console.log('Creating backdated notifications...');
    const notifications = [];
    for (const person of allMembers) {
      const templateIndexes = new Set();
      while (templateIndexes.size < 3) templateIndexes.add(randomInt(0, notificationTemplates.length - 1));
      for (const idx of templateIndexes) {
        const t = notificationTemplates[idx];
        notifications.push([person.userId, t.type, t.title, t.body, false, churchId, randomDateBetween(1, 0)]);
      }
    }
    await bulkInsert(client, 'notifications', ['user_id', 'type', 'title', 'body', 'is_read', 'church_id', 'created_at'], notifications);

    console.log('Creating backdated SMS logs...');
    const smsLogs = [];
    for (const person of allMembers) {
      smsLogs.push([person.phone, randomChoice(smsMessages), adminId, 'delivered', randomDateBetween(1, 0), randomDateBetween(1, 0)]);
    }
    await bulkInsert(client, 'sms_logs', ['recipient_phone', 'message', 'sender_id', 'status', 'sent_at', 'created_at'], smsLogs);

    await client.query('COMMIT');
    console.log(`✅ Seeding complete: ${allMembers.length} users (${fileCount} from workers file, ${extraAdults} generated adults, ${CHILD_COUNT} children), ${sections.filter(s => s.members.length > 0 && s.head).length} departments, ${notifications.length} notifications, ${smsLogs.length} SMS logs.`);
    console.log(`Default password for all seed users: ${DEFAULT_PASSWORD}`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

async function bulkInsert(client, table, columns, rows) {
  if (!rows.length) return;
  const batchSize = 100;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const placeholders = [];
    const params = [];
    let paramCount = 1;
    for (const row of batch) {
      const rowPlaceholders = [];
      for (const val of row) {
        rowPlaceholders.push(`$${paramCount++}`);
        params.push(val);
      }
      placeholders.push(`(${rowPlaceholders.join(', ')})`);
    }
    const query = `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${placeholders.join(', ')}`;
    await client.query(query, params);
  }
}

seed();
