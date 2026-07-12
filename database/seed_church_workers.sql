-- Seed data for church workers based on the provided list
-- This creates users, assigns them to departments, and sets up their roles

-- First, let's create some sample users based on the church workers list
-- We'll use a simple naming convention: firstname.lastname@kmaincms.org

-- Elders
INSERT INTO users (email, password_hash, first_name, last_name, is_active, email_verified) VALUES
('george.nganga@kmaincms.org', '$2b$10$dummyHashForTesting12345678901234567890123456789012345678901234567890', 'George', 'Nganga', true, true),
('john.monda@kmaincms.org', '$2b$10$dummyHashForTesting12345678901234567890123456789012345678901234567890', 'John', 'Monda', true, true),
('paul.karongo@kmaincms.org', '$2b$10$dummyHashForTesting12345678901234567890123456789012345678901234567890', 'Paul', 'Karongo', true, true),
('george.onchogo@kmaincms.org', '$2b$10$dummyHashForTesting12345678901234567890123456789012345678901234567890', 'George', 'Onchogo', true, true),
('stephen.nganga@kmaincms.org', '$2b$10$dummyHashForTesting12345678901234567890123456789012345678901234567890', 'Stephen', 'Nganga', true, true),
('moses.khamala@kmaincms.org', '$2b$10$dummyHashForTesting12345678901234567890123456789012345678901234567890', 'Moses', 'Khamala', true, true),
('thomas.gichinga@kmaincms.org', '$2b$10$dummyHashForTesting12345678901234567890123456789012345678901234567890', 'Thomas', 'Gichinga', true, true),
('elijah.mokua@kmaincms.org', '$2b$10$dummyHashForTesting12345678901234567890123456789012345678901234567890', 'Elijah', 'Mokua', true, true),
('leonard.gitonga@kmaincms.org', '$2b$10$dummyHashForTesting12345678901234567890123456789012345678901234567890', 'Leonard', 'Gitonga', true, true),
('stephen.onyancha@kmaincms.org', '$2b$10$dummyHashForTesting12345678901234567890123456789012345678901234567890', 'Stephen', 'Onyancha', true, true),
('joash.mogesa@kmaincms.org', '$2b$10$dummyHashForTesting12345678901234567890123456789012345678901234567890', 'Joash', 'Mogesa', true, true),
('robert.ruuge@kmaincms.org', '$2b$10$dummyHashForTesting12345678901234567890123456789012345678901234567890', 'Robert', 'Ruuge', true, true),
('samuel.onchari@kmaincms.org', '$2b$10$dummyHashForTesting12345678901234567890123456789012345678901234567890', 'Samuel', 'Onchari', true, true),
('samson.omae@kmaincms.org', '$2b$10$dummyHashForTesting12345678901234567890123456789012345678901234567890', 'Samson', 'Omae', true, true),
('jeremiah.kuraru@kmaincms.org', '$2b$10$dummyHashForTesting12345678901234567890123456789012345678901234567890', 'Jeremiah', 'Kuraru', true, true),
('martin.amalemba@kmaincms.org', '$2b$10$dummyHashForTesting12345678901234567890123456789012345678901234567890', 'Martin', 'Amalemba', true, true),
('edward.ongeri@kmaincms.org', '$2b$10$dummyHashForTesting12345678901234567890123456789012345678901234567890', 'Edward', 'Ongeri', true, true),
('fredrick.wachira@kmaincms.org', '$2b$10$dummyHashForTesting12345678901234567890123456789012345678901234567890', 'Fredrick', 'Wachira', true, true),
('henry.mokaya@kmaincms.org', '$2b$10$dummyHashForTesting12345678901234567890123456789012345678901234567890', 'Henry', 'Mokaya', true, true)
ON CONFLICT (email) DO NOTHING;

-- Deacons
INSERT INTO users (email, password_hash, first_name, last_name, is_active, email_verified) VALUES
('kennedy.mbatia@kmaincms.org', '$2b$10$dummyHashForTesting12345678901234567890123456789012345678901234567890', 'Kennedy', 'Mbatia', true, true),
('joseph.auka@kmaincms.org', '$2b$10$dummyHashForTesting12345678901234567890123456789012345678901234567890', 'Joseph', 'Auka', true, true),
('tom.mboya@kmaincms.org', '$2b$10$dummyHashForTesting12345678901234567890123456789012345678901234567890', 'Tom', 'Mboya', true, true),
('joel.maoro@kmaincms.org', '$2b$10$dummyHashForTesting12345678901234567890123456789012345678901234567890', 'Joel', 'Maoro', true, true),
('geoffrey.karimi@kmaincms.org', '$2b$10$dummyHashForTesting12345678901234567890123456789012345678901234567890', 'Geoffrey', 'Karimi', true, true),
('james.ogato@kmaincms.org', '$2b$10$dummyHashForTesting12345678901234567890123456789012345678901234567890', 'James', 'Ogato', true, true),
('jones.momanyi@kmaincms.org', '$2b$10$dummyHashForTesting12345678901234567890123456789012345678901234567890', 'Jones', 'Momanyi', true, true),
('arnold.mayaka@kmaincms.org', '$2b$10$dummyHashForTesting12345678901234567890123456789012345678901234567890', 'Arnold', 'Mayaka', true, true),
('francis.nganga@kmaincms.org', '$2b$10$dummyHashForTesting12345678901234567890123456789012345678901234567890', 'Francis', 'Nganga', true, true),
('george.muyaki@kmaincms.org', '$2b$10$dummyHashForTesting12345678901234567890123456789012345678901234567890', 'George', 'Muyaki', true, true)
ON CONFLICT (email) DO NOTHING;

-- Deaconesses
INSERT INTO users (email, password_hash, first_name, last_name, is_active, email_verified) VALUES
('zipporah.isaiah@kmaincms.org', '$2b$10$dummyHashForTesting12345678901234567890123456789012345678901234567890', 'Zipporah', 'Isaiah', true, true),
('mercy.achoki@kmaincms.org', '$2b$10$dummyHashForTesting12345678901234567890123456789012345678901234567890', 'Mercy', 'Achoki', true, true),
('jane.kiongo@kmaincms.org', '$2b$10$dummyHashForTesting12345678901234567890123456789012345678901234567890', 'Jane', 'Kiongo', true, true),
('rosemary.gachege@kmaincms.org', '$2b$10$dummyHashForTesting12345678901234567890123456789012345678901234567890', 'Rosemary', 'Gachege', true, true),
('esther.bosibori@kmaincms.org', '$2b$10$dummyHashForTesting12345678901234567890123456789012345678901234567890', 'Esther', 'Bosibori', true, true),
('veronicah.ndungu@kmaincms.org', '$2b$10$dummyHashForTesting12345678901234567890123456789012345678901234567890', 'Veronicah', 'Ndungu', true, true),
('evalyn.mokaya@kmaincms.org', '$2b$10$dummyHashForTesting12345678901234567890123456789012345678901234567890', 'Evalyn', 'Mokaya', true, true),
('bancy.njogu@kmaincms.org', '$2b$10$dummyHashForTesting12345678901234567890123456789012345678901234567890', 'Bancy', 'Njogu', true, true),
('elizabeth.mutune@kmaincms.org', '$2b$10$dummyHashForTesting12345678901234567890123456789012345678901234567890', 'Elizabeth', 'Mutune', true, true),
('monicah.wamuyu@kmaincms.org', '$2b$10$dummyHashForTesting12345678901234567890123456789012345678901234567890', 'Monicah', 'Wamuyu', true, true)
ON CONFLICT (email) DO NOTHING;

-- Treasury
INSERT INTO users (email, password_hash, first_name, last_name, is_active, email_verified) VALUES
('elizabeth.mboya2@kmaincms.org', '$2b$10$dummyHashForTesting12345678901234567890123456789012345678901234567890', 'Elizabeth', 'Mboya', true, true),
('isaac.chabari@kmaincms.org', '$2b$10$dummyHashForTesting12345678901234567890123456789012345678901234567890', 'Isaac', 'Chabari', true, true),
('brian.mboga@kmaincms.org', '$2b$10$dummyHashForTesting12345678901234567890123456789012345678901234567890', 'Brian', 'Mboga', true, true),
('ambrose.mbugua@kmaincms.org', '$2b$10$dummyHashForTesting12345678901234567890123456789012345678901234567890', 'Ambrose', 'Mbugua', true, true),
('lucy.caleb@kmaincms.org', '$2b$10$dummyHashForTesting12345678901234567890123456789012345678901234567890', 'Lucy', 'Caleb', true, true)
ON CONFLICT (email) DO NOTHING;

-- Church Clerk
INSERT INTO users (email, password_hash, first_name, last_name, is_active, email_verified) VALUES
('esther.okemwa@kmaincms.org', '$2b$10$dummyHashForTesting12345678901234567890123456789012345678901234567890', 'Esther', 'Okemwa', true, true),
('joshua.nyakundi@kmaincms.org', '$2b$10$dummyHashForTesting12345678901234567890123456789012345678901234567890', 'Joshua', 'Nyakundi', true, true)
ON CONFLICT (email) DO NOTHING;

-- Youth and Children Ministry
INSERT INTO users (email, password_hash, first_name, last_name, is_active, email_verified) VALUES
('mitchel.chabari@kmaincms.org', '$2b$10$dummyHashForTesting12345678901234567890123456789012345678901234567890', 'Mitchel', 'Chabari', true, true),
('nancy.gathoni@kmaincms.org', '$2b$10$dummyHashForTesting12345678901234567890123456789012345678901234567890', 'Nancy', 'Gathoni', true, true),
('casper.lewis@kmaincms.org', '$2b$10$dummyHashForTesting12345678901234567890123456789012345678901234567890', 'Casper', 'Lewis', true, true),
('mary.benson@kmaincms.org', '$2b$10$dummyHashForTesting12345678901234567890123456789012345678901234567890', 'Mary', 'Benson', true, true),
('elizabeth.magembe@kmaincms.org', '$2b$10$dummyHashForTesting12345678901234567890123456789012345678901234567890', 'Elizabeth', 'Magembe', true, true),
('moses.magembe@kmaincms.org', '$2b$10$dummyHashForTesting12345678901234567890123456789012345678901234567890', 'Moses', 'Magembe', true, true)
ON CONFLICT (email) DO NOTHING;

-- Music Ministry
INSERT INTO users (email, password_hash, first_name, last_name, is_active, email_verified) VALUES
('george.ochogo@kmaincms.org', '$2b$10$dummyHashForTesting12345678901234567890123456789012345678901234567890', 'George', 'Ochogo', true, true),
('maureen.ochogo@kmaincms.org', '$2b$10$dummyHashForTesting12345678901234567890123456789012345678901234567890', 'Maureen', 'Ochogo', true, true),
('linet.okemwa@kmaincms.org', '$2b$10$dummyHashForTesting12345678901234567890123456789012345678901234567890', 'Linet', 'Okemwa', true, true),
('sammy.mureithi@kmaincms.org', '$2b$10$dummyHashForTesting12345678901234567890123456789012345678901234567890', 'Sammy', 'Mureithi', true, true)
ON CONFLICT (email) DO NOTHING;

-- Sabbath School
INSERT INTO users (email, password_hash, first_name, last_name, is_active, email_verified) VALUES
('kirsten.gathogo@kmaincms.org', '$2b$10$dummyHashForTesting12345678901234567890123456789012345678901234567890', 'Kirsten', 'Gathogo', true, true),
('abel.nyakundi@kmaincms.org', '$2b$10$dummyHashForTesting12345678901234567890123456789012345678901234567890', 'Abel', 'Nyakundi', true, true),
('milkah.rongai@kmaincms.org', '$2b$10$dummyHashForTesting12345678901234567890123456789012345678901234567890', 'Milkah', 'Rongai', true, true),
('lizabeth.chabari@kmaincms.org', '$2b$10$dummyHashForTesting12345678901234567890123456789012345678901234567890', 'Lizbeth', 'Chabari', true, true)
ON CONFLICT (email) DO NOTHING;

-- Other key leaders
INSERT INTO users (email, password_hash, first_name, last_name, is_active, email_verified) VALUES
('gerald.magati@kmaincms.org', '$2b$10$dummyHashForTesting12345678901234567890123456789012345678901234567890', 'Gerald', 'Magati', true, true),
('gladys.magati@kmaincms.org', '$2b$10$dummyHashForTesting12345678901234567890123456789012345678901234567890', 'Gladys', 'Magati', true, true),
('raphael.mahianyu@kmaincms.org', '$2b$10$dummyHashForTesting12345678901234567890123456789012345678901234567890', 'Raphael', 'Mahianyu', true, true),
('rhoda.mabiria@kmaincms.org', '$2b$10$dummyHashForTesting12345678901234567890123456789012345678901234567890', 'Rhoda', 'Mabiria', true, true),
('monicah.ndungu@kmaincms.org', '$2b$10$dummyHashForTesting12345678901234567890123456789012345678901234567890', 'Monicah', 'Ndungu', true, true),
('josiah.omesa@kmaincms.org', '$2b$10$dummyHashForTesting12345678901234567890123456789012345678901234567890', 'Josiah', 'Omesa', true, true),
('mbatia.njoroge@kmaincms.org', '$2b$10$dummyHashForTesting12345678901234567890123456789012345678901234567890', 'Mbatia', 'Njoroge', true, true),
('edith.wachira@kmaincms.org', '$2b$10$dummyHashForTesting12345678901234567890123456789012345678901234567890', 'Edith', 'Wachira', true, true),
('benard.chienga@kmaincms.org', '$2b$10$dummyHashForTesting12345678901234567890123456789012345678901234567890', 'Benard', 'Chienga', true, true),
('gladys.kimori@kmaincms.org', '$2b$10$dummyHashForTesting12345678901234567890123456789012345678901234567890', 'Gladys', 'Kimori', true, true),
('eucabeth.chacha@kmaincms.org', '$2b$10$dummyHashForTesting12345678901234567890123456789012345678901234567890', 'Eucabeth', 'Chacha', true, true),
('ken.okoth@kmaincms.org', '$2b$10$dummyHashForTesting12345678901234567890123456789012345678901234567890', 'Ken', 'Okoth', true, true),
('julian.maihanyu@kmaincms.org', '$2b$10$dummyHashForTesting12345678901234567890123456789012345678901234567890', 'Julian', 'Maihanyu', true, true),
('okemwa.ogwoka@kmaincms.org', '$2b$10$dummyHashForTesting12345678901234567890123456789012345678901234567890', 'Okemwa', 'Ogwoka', true, true),
('millicent.okoth@kmaincms.org', '$2b$10$dummyHashForTesting12345678901234567890123456789012345678901234567890', 'Millicent', 'Okoth', true, true)
ON CONFLICT (email) DO NOTHING;

-- Assign roles to users (Elders get Pastor role, others get Member role)
-- First, get the role IDs
DO $$
DECLARE
  pastor_role_id INTEGER;
  member_role_id INTEGER;
  dept_head_role_id INTEGER;
BEGIN
  SELECT id INTO pastor_role_id FROM roles WHERE name = 'Pastor' LIMIT 1;
  SELECT id INTO member_role_id FROM roles WHERE name = 'Member' LIMIT 1;
  SELECT id INTO dept_head_role_id FROM roles WHERE name = 'Department Head' LIMIT 1;

  -- Assign Pastor role to elders
  INSERT INTO user_roles (user_id, role_id)
  SELECT u.id, pastor_role_id
  FROM users u
  WHERE u.email IN (
    'george.nganga@kmaincms.org',
    'john.monda@kmaincms.org',
    'paul.karongo@kmaincms.org',
    'george.onchogo@kmaincms.org',
    'stephen.nganga@kmaincms.org',
    'moses.khamala@kmaincms.org',
    'thomas.gichinga@kmaincms.org',
    'elijah.mokua@kmaincms.org',
    'leonard.gitonga@kmaincms.org',
    'stephen.onyancha@kmaincms.org'
  )
  ON CONFLICT DO NOTHING;

  -- Assign Department Head role to key leaders
  INSERT INTO user_roles (user_id, role_id)
  SELECT u.id, dept_head_role_id
  FROM users u
  WHERE u.email IN (
    'kennedy.mbatia@kmaincms.org',
    'zipporah.isaiah@kmaincms.org',
    'elizabeth.mboya2@kmaincms.org',
    'esther.okemwa@kmaincms.org',
    'mitchel.chabari@kmaincms.org',
    'george.ochogo@kmaincms.org',
    'kirsten.gathogo@kmaincms.org',
    'gerald.magati@kmaincms.org',
    'rhoda.mabiria@kmaincms.org',
    'josiah.omesa@kmaincms.org'
  )
  ON CONFLICT DO NOTHING;

  -- Assign Member role to all other users
  INSERT INTO user_roles (user_id, role_id)
  SELECT u.id, member_role_id
  FROM users u
  WHERE u.id NOT IN (
    SELECT ur.user_id FROM user_roles ur
  )
  ON CONFLICT DO NOTHING;
END $$;

-- Assign users to departments based on the church workers list
DO $$
DECLARE
  elders_dept_id INTEGER;
  deaconry_dept_id INTEGER;
  treasurer_dept_id INTEGER;
  clerk_dept_id INTEGER;
  youth_dept_id INTEGER;
  children_dept_id INTEGER;
  music_dept_id INTEGER;
  sabbath_school_dept_id INTEGER;
  personal_ministry_dept_id INTEGER;
  dorcas_dept_id INTEGER;
  men_ministry_dept_id INTEGER;
  women_ministry_dept_id INTEGER;
  health_ministry_dept_id INTEGER;
  family_life_dept_id INTEGER;
  communication_dept_id INTEGER;
  development_dept_id INTEGER;
  welfare_dept_id INTEGER;
BEGIN
  -- Get department IDs
  SELECT id INTO elders_dept_id FROM departments WHERE name = 'Elders' LIMIT 1;
  SELECT id INTO deaconry_dept_id FROM departments WHERE name = 'Deaconry' LIMIT 1;
  SELECT id INTO treasurer_dept_id FROM departments WHERE name = 'Treasurer' LIMIT 1;
  SELECT id INTO clerk_dept_id FROM departments WHERE name = 'Church Clerk' LIMIT 1;
  SELECT id INTO youth_dept_id FROM departments WHERE name = 'Youth Ministry' LIMIT 1;
  SELECT id INTO children_dept_id FROM departments WHERE name = 'Children Ministry' LIMIT 1;
  SELECT id INTO music_dept_id FROM departments WHERE name = 'Music Ministry' LIMIT 1;
  SELECT id INTO sabbath_school_dept_id FROM departments WHERE name = 'Sabbath School' LIMIT 1;
  SELECT id INTO personal_ministry_dept_id FROM departments WHERE name = 'Personal Ministry' LIMIT 1;
  SELECT id INTO dorcas_dept_id FROM departments WHERE name = 'Dorcas' LIMIT 1;
  SELECT id INTO men_ministry_dept_id FROM departments WHERE name = 'Adventist Men Ministry' LIMIT 1;
  SELECT id INTO women_ministry_dept_id FROM departments WHERE name = 'Adventist Women Ministry' LIMIT 1;
  SELECT id INTO health_ministry_dept_id FROM departments WHERE name = 'Health Ministry' LIMIT 1;
  SELECT id INTO family_life_dept_id FROM departments WHERE name = 'Family Life' LIMIT 1;
  SELECT id INTO communication_dept_id FROM departments WHERE name = 'Communication Secretary' LIMIT 1;
  SELECT id INTO development_dept_id FROM departments WHERE name = 'Development' LIMIT 1;
  SELECT id INTO welfare_dept_id FROM departments WHERE name = 'Welfare' LIMIT 1;

  -- Assign elders to Elders department
  INSERT INTO department_members (user_id, department_id, role)
  SELECT u.id, elders_dept_id, 'Elder'
  FROM users u
  WHERE u.email IN (
    'george.nganga@kmaincms.org',
    'john.monda@kmaincms.org',
    'paul.karongo@kmaincms.org',
    'george.onchogo@kmaincms.org',
    'stephen.nganga@kmaincms.org',
    'moses.khamala@kmaincms.org',
    'thomas.gichinga@kmaincms.org',
    'elijah.mokua@kmaincms.org',
    'leonard.gitonga@kmaincms.org',
    'stephen.onyancha@kmaincms.org'
  )
  ON CONFLICT DO NOTHING;

  -- Assign deacons to Deaconry department
  INSERT INTO department_members (user_id, department_id, role)
  SELECT u.id, deaconry_dept_id, 'Deacon'
  FROM users u
  WHERE u.email IN (
    'kennedy.mbatia@kmaincms.org',
    'joseph.auka@kmaincms.org',
    'tom.mboya@kmaincms.org',
    'joel.maoro@kmaincms.org',
    'geoffrey.karimi@kmaincms.org',
    'james.ogato@kmaincms.org',
    'jones.momanyi@kmaincms.org',
    'arnold.mayaka@kmaincms.org'
  )
  ON CONFLICT DO NOTHING;

  -- Assign deaconesses to Deaconry department
  INSERT INTO department_members (user_id, department_id, role)
  SELECT u.id, deaconry_dept_id, 'Deaconess'
  FROM users u
  WHERE u.email IN (
    'zipporah.isaiah@kmaincms.org',
    'mercy.achoki@kmaincms.org',
    'jane.kiongo@kmaincms.org',
    'rosemary.gachege@kmaincms.org',
    'esther.bosibori@kmaincms.org',
    'veronicah.ndungu@kmaincms.org',
    'evalyn.mokaya@kmaincms.org',
    'bancy.njogu@kmaincms.org'
  )
  ON CONFLICT DO NOTHING;

  -- Assign treasurer staff
  INSERT INTO department_members (user_id, department_id, role)
  SELECT u.id, treasurer_dept_id, 'Treasurer'
  FROM users u
  WHERE u.email = 'elizabeth.mboya2@kmaincms.org'
  ON CONFLICT DO NOTHING;

  INSERT INTO department_members (user_id, department_id, role)
  SELECT u.id, treasurer_dept_id, 'Assistant'
  FROM users u
  WHERE u.email IN ('isaac.chabari@kmaincms.org', 'brian.mboga@kmaincms.org', 'ambrose.mbugua@kmaincms.org')
  ON CONFLICT DO NOTHING;

  -- Assign clerk staff
  INSERT INTO department_members (user_id, department_id, role)
  SELECT u.id, clerk_dept_id, 'Church Clerk'
  FROM users u
  WHERE u.email = 'esther.okemwa@kmaincms.org'
  ON CONFLICT DO NOTHING;

  -- Assign youth ministry staff
  INSERT INTO department_members (user_id, department_id, role)
  SELECT u.id, youth_dept_id, 'Leader'
  FROM users u
  WHERE u.email = 'mitchel.chabari@kmaincms.org'
  ON CONFLICT DO NOTHING;

  INSERT INTO department_members (user_id, department_id, role)
  SELECT u.id, youth_dept_id, 'Assistant'
  FROM users u
  WHERE u.email IN ('joshua.nyakundi@kmaincms.org', 'nancy.gathoni@kmaincms.org')
  ON CONFLICT DO NOTHING;

  -- Assign children ministry staff
  INSERT INTO department_members (user_id, department_id, role)
  SELECT u.id, children_dept_id, 'Leader'
  FROM users u
  WHERE u.email = 'elizabeth.magembe@kmaincms.org'
  ON CONFLICT DO NOTHING;

  -- Assign music ministry staff
  INSERT INTO department_members (user_id, department_id, role)
  SELECT u.id, music_dept_id, 'Leader'
  FROM users u
  WHERE u.email = 'george.ochogo@kmaincms.org'
  ON CONFLICT DO NOTHING;

  INSERT INTO department_members (user_id, department_id, role)
  SELECT u.id, music_dept_id, 'Chorister'
  FROM users u
  WHERE u.email IN ('maureen.ochogo@kmaincms.org', 'linet.okemwa@kmaincms.org', 'sammy.mureithi@kmaincms.org')
  ON CONFLICT DO NOTHING;

  -- Assign sabbath school staff
  INSERT INTO department_members (user_id, department_id, role)
  SELECT u.id, sabbath_school_dept_id, 'Superintendent'
  FROM users u
  WHERE u.email = 'kirsten.gathogo@kmaincms.org'
  ON CONFLICT DO NOTHING;

  INSERT INTO department_members (user_id, department_id, role)
  SELECT u.id, sabbath_school_dept_id, 'Assistant'
  FROM users u
  WHERE u.email IN ('abel.nyakundi@kmaincms.org', 'milkah.rongai@kmaincms.org', 'lizabeth.chabari@kmaincms.org')
  ON CONFLICT DO NOTHING;

  -- Assign other ministry leaders
  INSERT INTO department_members (user_id, department_id, role)
  SELECT u.id, personal_ministry_dept_id, 'Director'
  FROM users u
  WHERE u.email = 'thomas.gichinga@kmaincms.org'
  ON CONFLICT DO NOTHING;

  INSERT INTO department_members (user_id, department_id, role)
  SELECT u.id, dorcas_dept_id, 'Leader'
  FROM users u
  WHERE u.email = 'julian.maihanyu@kmaincms.org'
  ON CONFLICT DO NOTHING;

  INSERT INTO department_members (user_id, department_id, role)
  SELECT u.id, men_ministry_dept_id, 'Leader'
  FROM users u
  WHERE u.email = 'okemwa.ogwoka@kmaincms.org'
  ON CONFLICT DO NOTHING;

  INSERT INTO department_members (user_id, department_id, role)
  SELECT u.id, women_ministry_dept_id, 'Leader'
  FROM users u
  WHERE u.email = 'eucabeth.chacha@kmaincms.org'
  ON CONFLICT DO NOTHING;

  INSERT INTO department_members (user_id, department_id, role)
  SELECT u.id, health_ministry_dept_id, 'Leader'
  FROM users u
  WHERE u.email = 'raphael.mahianyu@kmaincms.org'
  ON CONFLICT DO NOTHING;

  INSERT INTO department_members (user_id, department_id, role)
  SELECT u.id, family_life_dept_id, 'Leader'
  FROM users u
  WHERE u.email = 'gerald.magati@kmaincms.org'
  ON CONFLICT DO NOTHING;

  INSERT INTO department_members (user_id, department_id, role)
  SELECT u.id, communication_dept_id, 'Communication Secretary'
  FROM users u
  WHERE u.email = 'josiah.omesa@kmaincms.org'
  ON CONFLICT DO NOTHING;

  INSERT INTO department_members (user_id, department_id, role)
  SELECT u.id, development_dept_id, 'Leader'
  FROM users u
  WHERE u.email = 'gerald.magati@kmaincms.org'
  ON CONFLICT DO NOTHING;

  INSERT INTO department_members (user_id, department_id, role)
  SELECT u.id, welfare_dept_id, 'Leader'
  FROM users u
  WHERE u.email = 'gladys.kimori@kmaincms.org'
  ON CONFLICT DO NOTHING;
END $$;

-- Create some sample content for testing
INSERT INTO content_items (title, slug, content, content_type, category_id, author_id, status, published_at) VALUES
('Welcome to Kiserian Main SDA Church', 'welcome-to-kiserian-main-sda-church', 'We are delighted to welcome you to our church family. Join us for worship every Saturday.', 'page', (SELECT id FROM content_categories WHERE name = 'Announcements' LIMIT 1), (SELECT id FROM users WHERE email = 'george.nganga@kmaincms.org' LIMIT 1), 'published', CURRENT_TIMESTAMP),
('Weekly Sermon: Faith in Action', 'weekly-sermon-faith-in-action', 'This week we explore what it means to put our faith into action in our daily lives.', 'sermon', (SELECT id FROM content_categories WHERE name = 'Sermons' LIMIT 1), (SELECT id FROM users WHERE email = 'george.nganga@kmaincms.org' LIMIT 1), 'published', CURRENT_TIMESTAMP),
('Upcoming Church Events', 'upcoming-church-events', 'Join us for our upcoming events including the youth camp meeting and community outreach programs.', 'announcement', (SELECT id FROM content_categories WHERE name = 'Events' LIMIT 1), (SELECT id FROM users WHERE email = 'esther.okemwa@kmaincms.org' LIMIT 1), 'published', CURRENT_TIMESTAMP)
ON CONFLICT (slug) DO NOTHING;

-- Create sample gallery album
INSERT INTO gallery_albums (title, description, created_by) VALUES
('Church Services', 'Photos from our weekly church services', (SELECT id FROM users WHERE email = 'george.ochogo@kmaincms.org' LIMIT 1)),
('Youth Events', 'Photos from youth ministry events and activities', (SELECT id FROM users WHERE email = 'mitchel.chabari@kmaincms.org' LIMIT 1)),
('Community Outreach', 'Photos from our community service activities', (SELECT id FROM users WHERE email = 'thomas.gichinga@kmaincms.org' LIMIT 1))
ON CONFLICT DO NOTHING;

-- Create sample church account
INSERT INTO church_accounts (account_name, account_number, bank_name, account_type, balance, currency) VALUES
('Main Church Account', '1234567890', 'KCB Bank', 'checking', 500000.00, 'KES'),
('Tithe Account', '0987654321', 'Equity Bank', 'savings', 250000.00, 'KES'),
('Mission Fund', '1122334455', 'Cooperative Bank', 'savings', 100000.00, 'KES')
ON CONFLICT (account_name) DO NOTHING;

-- Create sample transactions
INSERT INTO transactions (transaction_type, category_id, account_id, amount, description, transaction_date, recorded_by, status, payment_method) VALUES
('income', (SELECT id FROM income_categories WHERE code = 'TITHE' LIMIT 1), (SELECT id FROM church_accounts WHERE account_name = 'Tithe Account' LIMIT 1), 15000.00, 'Weekly tithes', CURRENT_DATE, (SELECT id FROM users WHERE email = 'elizabeth.mboya2@kmaincms.org' LIMIT 1), 'approved', 'cash'),
('income', (SELECT id FROM income_categories WHERE code = 'OFFERING' LIMIT 1), (SELECT id FROM church_accounts WHERE account_name = 'Main Church Account' LIMIT 1), 25000.00, 'Sabbath offering', CURRENT_DATE, (SELECT id FROM users WHERE email = 'elizabeth.mboya2@kmaincms.org' LIMIT 1), 'approved', 'cash'),
('expense', (SELECT id FROM expense_categories WHERE code = 'UTILITIES' LIMIT 1), (SELECT id FROM church_accounts WHERE account_name = 'Main Church Account' LIMIT 1), 5000.00, 'Electricity bill', CURRENT_DATE, (SELECT id FROM users WHERE email = 'elizabeth.mboya2@kmaincms.org' LIMIT 1), 'approved', 'bank_transfer'),
('expense', (SELECT id FROM expense_categories WHERE code = 'MAINTENANCE' LIMIT 1), (SELECT id FROM church_accounts WHERE account_name = 'Main Church Account' LIMIT 1), 3000.00, 'Building maintenance', CURRENT_DATE, (SELECT id FROM users WHERE email = 'elizabeth.mboya2@kmaincms.org' LIMIT 1), 'approved', 'cash')
ON CONFLICT DO NOTHING;

-- Create sample budget
INSERT INTO budgets (name, fiscal_year, start_date, end_date, total_income_budget, total_expense_budget, created_by, status) VALUES
('2024 Annual Budget', 2024, '2024-01-01', '2024-12-31', 1200000.00, 1000000.00, (SELECT id FROM users WHERE email = 'elizabeth.mboya2@kmaincms.org' LIMIT 1), 'active')
ON CONFLICT DO NOTHING;

-- Create sample budget items
INSERT INTO budget_items (budget_id, category_id, category_type, amount, notes) VALUES
((SELECT id FROM budgets WHERE name = '2024 Annual Budget' LIMIT 1), (SELECT id FROM income_categories WHERE code = 'TITHE' LIMIT 1), 'income', 600000.00, 'Expected tithes for the year'),
((SELECT id FROM budgets WHERE name = '2024 Annual Budget' LIMIT 1), (SELECT id FROM income_categories WHERE code = 'OFFERING' LIMIT 1), 'income', 300000.00, 'Expected offerings'),
((SELECT id FROM budgets WHERE name = '2024 Annual Budget' LIMIT 1), (SELECT id FROM expense_categories WHERE code = 'SALARY' LIMIT 1), 'expense', 400000.00, 'Staff salaries'),
((SELECT id FROM budgets WHERE name = '2024 Annual Budget' LIMIT 1), (SELECT id FROM expense_categories WHERE code = 'UTILITIES' LIMIT 1), 'expense', 100000.00, 'Water, electricity, and other utilities')
ON CONFLICT DO NOTHING;

-- Create sample payments
INSERT INTO payments (payment_method_id, amount, payment_type, reference_number, status, payment_date, processed_by, notes) VALUES
((SELECT id FROM payment_methods WHERE name = 'M-Pesa' LIMIT 1), 5000.00, 'tithe', 'MP-2024-001', 'completed', CURRENT_TIMESTAMP, (SELECT id FROM users WHERE email = 'elizabeth.mboya2@kmaincms.org' LIMIT 1), 'Tithe via M-Pesa'),
((SELECT id FROM payment_methods WHERE name = 'Cash' LIMIT 1), 2000.00, 'offering', 'CASH-2024-001', 'completed', CURRENT_TIMESTAMP, (SELECT id FROM users WHERE email = 'elizabeth.mboya2@kmaincms.org' LIMIT 1), 'Sabbath offering'),
((SELECT id FROM payment_methods WHERE name = 'Bank Transfer' LIMIT 1), 10000.00, 'donation', 'BANK-2024-001', 'completed', CURRENT_TIMESTAMP, (SELECT id FROM users WHERE email = 'elizabeth.mboya2@kmaincms.org' LIMIT 1), 'Building fund donation')
ON CONFLICT (reference_number) DO NOTHING;

-- Create sample pledges
INSERT INTO pledges (amount, pledge_type, start_date, end_date, frequency, status) VALUES
(50000.00, 'building', '2024-01-01', '2024-12-31', 'monthly', 'active'),
(25000.00, 'mission', '2024-01-01', '2024-12-31', 'quarterly', 'active'),
(10000.00, 'general', '2024-01-01', '2024-12-31', 'monthly', 'active')
ON CONFLICT DO NOTHING;

-- Create sample department meetings
INSERT INTO department_meetings (department_id, title, description, meeting_date, duration, location, organizer_id, status) VALUES
((SELECT id FROM departments WHERE name = 'Elders' LIMIT 1), 'Monthly Elders Meeting', 'Regular monthly meeting of the church elders council', CURRENT_DATE + INTERVAL '7 days', 120, 'Church Board Room', (SELECT id FROM users WHERE email = 'george.nganga@kmaincms.org' LIMIT 1), 'scheduled'),
((SELECT id FROM departments WHERE name = 'Deaconry' LIMIT 1), 'Deaconry Planning Meeting', 'Planning session for upcoming church activities', CURRENT_DATE + INTERVAL '3 days', 90, 'Church Hall', (SELECT id FROM users WHERE email = 'kennedy.mbatia@kmaincms.org' LIMIT 1), 'scheduled'),
((SELECT id FROM departments WHERE name = 'Youth Ministry' LIMIT 1), 'Youth Ministry Coordination', 'Monthly youth ministry coordination meeting', CURRENT_DATE + INTERVAL '5 days', 60, 'Youth Room', (SELECT id FROM users WHERE email = 'mitchel.chabari@kmaincms.org' LIMIT 1), 'scheduled')
ON CONFLICT DO NOTHING;

-- Create sample department tasks
INSERT INTO department_tasks (department_id, title, description, assigned_to, assigned_by, due_date, priority, status) VALUES
((SELECT id FROM departments WHERE name = 'Elders' LIMIT 1), 'Review Church Budget', 'Review and approve the annual church budget', (SELECT id FROM users WHERE email = 'george.nganga@kmaincms.org' LIMIT 1), (SELECT id FROM users WHERE email = 'george.nganga@kmaincms.org' LIMIT 1), CURRENT_DATE + INTERVAL '14 days', 'high', 'pending'),
((SELECT id FROM departments WHERE name = 'Deaconry' LIMIT 1), 'Prepare for Sabbath Service', 'Ensure all preparations are made for the upcoming Sabbath service', (SELECT id FROM users WHERE email = 'kennedy.mbatia@kmaincms.org' LIMIT 1), (SELECT id FROM users WHERE email = 'kennedy.mbatia@kmaincms.org' LIMIT 1), CURRENT_DATE + INTERVAL '2 days', 'high', 'in_progress'),
((SELECT id FROM departments WHERE name = 'Youth Ministry' LIMIT 1), 'Plan Youth Camp', 'Plan and organize the upcoming youth camp meeting', (SELECT id FROM users WHERE email = 'mitchel.chabari@kmaincms.org' LIMIT 1), (SELECT id FROM users WHERE email = 'mitchel.chabari@kmaincms.org' LIMIT 1), CURRENT_DATE + INTERVAL '30 days', 'medium', 'pending')
ON CONFLICT DO NOTHING;

-- Create sample department resources
INSERT INTO department_resources (department_id, name, description, type, url, uploaded_by, is_public) VALUES
((SELECT id FROM departments WHERE name = 'Elders' LIMIT 1), 'Church Constitution', 'Official church constitution document', 'Document', '', (SELECT id FROM users WHERE email = 'esther.okemwa@kmaincms.org' LIMIT 1), true),
((SELECT id FROM departments WHERE name = 'Deaconry' LIMIT 1), 'Deaconry Handbook', 'Guidelines and procedures for deaconry ministry', 'Document', '', (SELECT id FROM users WHERE email = 'kennedy.mbatia@kmaincms.org' LIMIT 1), true),
((SELECT id FROM departments WHERE name = 'Youth Ministry' LIMIT 1), 'Youth Ministry Resources', 'Resources for youth ministry programs', 'Document', '', (SELECT id FROM users WHERE email = 'mitchel.chabari@kmaincms.org' LIMIT 1), true)
ON CONFLICT DO NOTHING;