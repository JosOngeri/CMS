-- Seed data for church workers based on the provided list
-- This creates users, assigns them to departments, and sets up their roles

-- First, let's create some sample users based on the church workers list
-- We'll use a simple naming convention: worker01@example.invalid

-- Elders
INSERT INTO users (email, password_hash, first_name, last_name, is_active, email_verified) VALUES
('worker02@example.invalid', 'INVALID_HASH_SEE_README', 'Worker', '02', true, true),
('worker03@example.invalid', 'INVALID_HASH_SEE_README', 'Worker', '03', true, true),
('worker04@example.invalid', 'INVALID_HASH_SEE_README', 'Worker', '04', true, true),
('worker05@example.invalid', 'INVALID_HASH_SEE_README', 'Worker', '05', true, true),
('worker06@example.invalid', 'INVALID_HASH_SEE_README', 'Worker', '06', true, true),
('worker07@example.invalid', 'INVALID_HASH_SEE_README', 'Worker', '07', true, true),
('worker08@example.invalid', 'INVALID_HASH_SEE_README', 'Worker', '08', true, true),
('worker09@example.invalid', 'INVALID_HASH_SEE_README', 'Worker', '09', true, true),
('worker10@example.invalid', 'INVALID_HASH_SEE_README', 'Worker', '10', true, true),
('worker11@example.invalid', 'INVALID_HASH_SEE_README', 'Worker', '11', true, true),
('worker12@example.invalid', 'INVALID_HASH_SEE_README', 'Worker', '12', true, true),
('worker13@example.invalid', 'INVALID_HASH_SEE_README', 'Worker', '13', true, true),
('worker14@example.invalid', 'INVALID_HASH_SEE_README', 'Worker', '14', true, true),
('worker15@example.invalid', 'INVALID_HASH_SEE_README', 'Worker', '15', true, true),
('worker16@example.invalid', 'INVALID_HASH_SEE_README', 'Worker', '16', true, true),
('worker17@example.invalid', 'INVALID_HASH_SEE_README', 'Worker', '17', true, true),
('worker18@example.invalid', 'INVALID_HASH_SEE_README', 'Worker', '18', true, true),
('worker19@example.invalid', 'INVALID_HASH_SEE_README', 'Worker', '19', true, true),
('worker20@example.invalid', 'INVALID_HASH_SEE_README', 'Worker', '20', true, true)
ON CONFLICT (email) DO NOTHING;

-- Deacons
INSERT INTO users (email, password_hash, first_name, last_name, is_active, email_verified) VALUES
('worker21@example.invalid', 'INVALID_HASH_SEE_README', 'Worker', '21', true, true),
('worker22@example.invalid', 'INVALID_HASH_SEE_README', 'Worker', '22', true, true),
('worker23@example.invalid', 'INVALID_HASH_SEE_README', 'Worker', '23', true, true),
('worker24@example.invalid', 'INVALID_HASH_SEE_README', 'Worker', '24', true, true),
('worker25@example.invalid', 'INVALID_HASH_SEE_README', 'Worker', '25', true, true),
('worker26@example.invalid', 'INVALID_HASH_SEE_README', 'Worker', '26', true, true),
('worker27@example.invalid', 'INVALID_HASH_SEE_README', 'Worker', '27', true, true),
('worker28@example.invalid', 'INVALID_HASH_SEE_README', 'Worker', '28', true, true),
('worker29@example.invalid', 'INVALID_HASH_SEE_README', 'Worker', '29', true, true),
('worker30@example.invalid', 'INVALID_HASH_SEE_README', 'Worker', '30', true, true)
ON CONFLICT (email) DO NOTHING;

-- Deaconesses
INSERT INTO users (email, password_hash, first_name, last_name, is_active, email_verified) VALUES
('worker31@example.invalid', 'INVALID_HASH_SEE_README', 'Worker', '31', true, true),
('worker32@example.invalid', 'INVALID_HASH_SEE_README', 'Worker', '32', true, true),
('worker33@example.invalid', 'INVALID_HASH_SEE_README', 'Worker', '33', true, true),
('worker34@example.invalid', 'INVALID_HASH_SEE_README', 'Worker', '34', true, true),
('worker35@example.invalid', 'INVALID_HASH_SEE_README', 'Worker', '35', true, true),
('worker36@example.invalid', 'INVALID_HASH_SEE_README', 'Worker', '36', true, true),
('worker37@example.invalid', 'INVALID_HASH_SEE_README', 'Worker', '37', true, true),
('worker38@example.invalid', 'INVALID_HASH_SEE_README', 'Worker', '38', true, true),
('worker39@example.invalid', 'INVALID_HASH_SEE_README', 'Worker', '39', true, true),
('worker40@example.invalid', 'INVALID_HASH_SEE_README', 'Worker', '40', true, true)
ON CONFLICT (email) DO NOTHING;

-- Treasury
INSERT INTO users (email, password_hash, first_name, last_name, is_active, email_verified) VALUES
('worker41@example.invalid', 'INVALID_HASH_SEE_README', 'Worker', '41', true, true),
('worker42@example.invalid', 'INVALID_HASH_SEE_README', 'Worker', '42', true, true),
('worker43@example.invalid', 'INVALID_HASH_SEE_README', 'Worker', '43', true, true),
('worker44@example.invalid', 'INVALID_HASH_SEE_README', 'Worker', '44', true, true),
('worker45@example.invalid', 'INVALID_HASH_SEE_README', 'Worker', '45', true, true)
ON CONFLICT (email) DO NOTHING;

-- Church Clerk
INSERT INTO users (email, password_hash, first_name, last_name, is_active, email_verified) VALUES
('worker46@example.invalid', 'INVALID_HASH_SEE_README', 'Worker', '46', true, true),
('worker47@example.invalid', 'INVALID_HASH_SEE_README', 'Worker', '47', true, true)
ON CONFLICT (email) DO NOTHING;

-- Youth and Children Ministry
INSERT INTO users (email, password_hash, first_name, last_name, is_active, email_verified) VALUES
('worker48@example.invalid', 'INVALID_HASH_SEE_README', 'Worker', '48', true, true),
('worker49@example.invalid', 'INVALID_HASH_SEE_README', 'Worker', '49', true, true),
('worker50@example.invalid', 'INVALID_HASH_SEE_README', 'Worker', '50', true, true),
('worker51@example.invalid', 'INVALID_HASH_SEE_README', 'Worker', '51', true, true),
('worker52@example.invalid', 'INVALID_HASH_SEE_README', 'Worker', '52', true, true),
('worker53@example.invalid', 'INVALID_HASH_SEE_README', 'Worker', '53', true, true)
ON CONFLICT (email) DO NOTHING;

-- Music Ministry
INSERT INTO users (email, password_hash, first_name, last_name, is_active, email_verified) VALUES
('worker54@example.invalid', 'INVALID_HASH_SEE_README', 'Worker', '54', true, true),
('worker55@example.invalid', 'INVALID_HASH_SEE_README', 'Worker', '55', true, true),
('worker56@example.invalid', 'INVALID_HASH_SEE_README', 'Worker', '56', true, true),
('worker57@example.invalid', 'INVALID_HASH_SEE_README', 'Worker', '57', true, true)
ON CONFLICT (email) DO NOTHING;

-- Sabbath School
INSERT INTO users (email, password_hash, first_name, last_name, is_active, email_verified) VALUES
('worker58@example.invalid', 'INVALID_HASH_SEE_README', 'Worker', '58', true, true),
('worker59@example.invalid', 'INVALID_HASH_SEE_README', 'Worker', '59', true, true),
('worker60@example.invalid', 'INVALID_HASH_SEE_README', 'Worker', '60', true, true),
('worker61@example.invalid', 'INVALID_HASH_SEE_README', 'Worker', '61', true, true)
ON CONFLICT (email) DO NOTHING;

-- Other key leaders
INSERT INTO users (email, password_hash, first_name, last_name, is_active, email_verified) VALUES
('worker62@example.invalid', 'INVALID_HASH_SEE_README', 'Worker', '62', true, true),
('worker63@example.invalid', 'INVALID_HASH_SEE_README', 'Worker', '63', true, true),
('worker64@example.invalid', 'INVALID_HASH_SEE_README', 'Worker', '64', true, true),
('worker65@example.invalid', 'INVALID_HASH_SEE_README', 'Worker', '65', true, true),
('worker66@example.invalid', 'INVALID_HASH_SEE_README', 'Worker', '66', true, true),
('worker67@example.invalid', 'INVALID_HASH_SEE_README', 'Worker', '67', true, true),
('worker68@example.invalid', 'INVALID_HASH_SEE_README', 'Worker', '68', true, true),
('worker69@example.invalid', 'INVALID_HASH_SEE_README', 'Worker', '69', true, true),
('worker70@example.invalid', 'INVALID_HASH_SEE_README', 'Worker', '70', true, true),
('worker71@example.invalid', 'INVALID_HASH_SEE_README', 'Worker', '71', true, true),
('worker72@example.invalid', 'INVALID_HASH_SEE_README', 'Worker', '72', true, true),
('worker73@example.invalid', 'INVALID_HASH_SEE_README', 'Worker', '73', true, true),
('worker74@example.invalid', 'INVALID_HASH_SEE_README', 'Worker', '74', true, true),
('worker75@example.invalid', 'INVALID_HASH_SEE_README', 'Worker', '75', true, true),
('worker76@example.invalid', 'INVALID_HASH_SEE_README', 'Worker', '76', true, true)
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
    'worker02@example.invalid',
    'worker03@example.invalid',
    'worker04@example.invalid',
    'worker05@example.invalid',
    'worker06@example.invalid',
    'worker07@example.invalid',
    'worker08@example.invalid',
    'worker09@example.invalid',
    'worker10@example.invalid',
    'worker11@example.invalid'
  )
  ON CONFLICT DO NOTHING;

  -- Assign Department Head role to key leaders
  INSERT INTO user_roles (user_id, role_id)
  SELECT u.id, dept_head_role_id
  FROM users u
  WHERE u.email IN (
    'worker21@example.invalid',
    'worker31@example.invalid',
    'worker41@example.invalid',
    'worker46@example.invalid',
    'worker48@example.invalid',
    'worker54@example.invalid',
    'worker58@example.invalid',
    'worker62@example.invalid',
    'worker65@example.invalid',
    'worker67@example.invalid'
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
    'worker02@example.invalid',
    'worker03@example.invalid',
    'worker04@example.invalid',
    'worker05@example.invalid',
    'worker06@example.invalid',
    'worker07@example.invalid',
    'worker08@example.invalid',
    'worker09@example.invalid',
    'worker10@example.invalid',
    'worker11@example.invalid'
  )
  ON CONFLICT DO NOTHING;

  -- Assign deacons to Deaconry department
  INSERT INTO department_members (user_id, department_id, role)
  SELECT u.id, deaconry_dept_id, 'Deacon'
  FROM users u
  WHERE u.email IN (
    'worker21@example.invalid',
    'worker22@example.invalid',
    'worker23@example.invalid',
    'worker24@example.invalid',
    'worker25@example.invalid',
    'worker26@example.invalid',
    'worker27@example.invalid',
    'worker28@example.invalid'
  )
  ON CONFLICT DO NOTHING;

  -- Assign deaconesses to Deaconry department
  INSERT INTO department_members (user_id, department_id, role)
  SELECT u.id, deaconry_dept_id, 'Deaconess'
  FROM users u
  WHERE u.email IN (
    'worker31@example.invalid',
    'worker32@example.invalid',
    'worker33@example.invalid',
    'worker34@example.invalid',
    'worker35@example.invalid',
    'worker36@example.invalid',
    'worker37@example.invalid',
    'worker38@example.invalid'
  )
  ON CONFLICT DO NOTHING;

  -- Assign treasurer staff
  INSERT INTO department_members (user_id, department_id, role)
  SELECT u.id, treasurer_dept_id, 'Treasurer'
  FROM users u
  WHERE u.email = 'worker41@example.invalid'
  ON CONFLICT DO NOTHING;

  INSERT INTO department_members (user_id, department_id, role)
  SELECT u.id, treasurer_dept_id, 'Assistant'
  FROM users u
  WHERE u.email IN ('worker42@example.invalid', 'worker43@example.invalid', 'worker44@example.invalid')
  ON CONFLICT DO NOTHING;

  -- Assign clerk staff
  INSERT INTO department_members (user_id, department_id, role)
  SELECT u.id, clerk_dept_id, 'Church Clerk'
  FROM users u
  WHERE u.email = 'worker46@example.invalid'
  ON CONFLICT DO NOTHING;

  -- Assign youth ministry staff
  INSERT INTO department_members (user_id, department_id, role)
  SELECT u.id, youth_dept_id, 'Leader'
  FROM users u
  WHERE u.email = 'worker48@example.invalid'
  ON CONFLICT DO NOTHING;

  INSERT INTO department_members (user_id, department_id, role)
  SELECT u.id, youth_dept_id, 'Assistant'
  FROM users u
  WHERE u.email IN ('worker47@example.invalid', 'worker49@example.invalid')
  ON CONFLICT DO NOTHING;

  -- Assign children ministry staff
  INSERT INTO department_members (user_id, department_id, role)
  SELECT u.id, children_dept_id, 'Leader'
  FROM users u
  WHERE u.email = 'worker52@example.invalid'
  ON CONFLICT DO NOTHING;

  -- Assign music ministry staff
  INSERT INTO department_members (user_id, department_id, role)
  SELECT u.id, music_dept_id, 'Leader'
  FROM users u
  WHERE u.email = 'worker54@example.invalid'
  ON CONFLICT DO NOTHING;

  INSERT INTO department_members (user_id, department_id, role)
  SELECT u.id, music_dept_id, 'Chorister'
  FROM users u
  WHERE u.email IN ('worker55@example.invalid', 'worker56@example.invalid', 'worker57@example.invalid')
  ON CONFLICT DO NOTHING;

  -- Assign sabbath school staff
  INSERT INTO department_members (user_id, department_id, role)
  SELECT u.id, sabbath_school_dept_id, 'Superintendent'
  FROM users u
  WHERE u.email = 'worker58@example.invalid'
  ON CONFLICT DO NOTHING;

  INSERT INTO department_members (user_id, department_id, role)
  SELECT u.id, sabbath_school_dept_id, 'Assistant'
  FROM users u
  WHERE u.email IN ('worker59@example.invalid', 'worker60@example.invalid', 'worker61@example.invalid')
  ON CONFLICT DO NOTHING;

  -- Assign other ministry leaders
  INSERT INTO department_members (user_id, department_id, role)
  SELECT u.id, personal_ministry_dept_id, 'Director'
  FROM users u
  WHERE u.email = 'worker08@example.invalid'
  ON CONFLICT DO NOTHING;

  INSERT INTO department_members (user_id, department_id, role)
  SELECT u.id, dorcas_dept_id, 'Leader'
  FROM users u
  WHERE u.email = 'worker74@example.invalid'
  ON CONFLICT DO NOTHING;

  INSERT INTO department_members (user_id, department_id, role)
  SELECT u.id, men_ministry_dept_id, 'Leader'
  FROM users u
  WHERE u.email = 'worker75@example.invalid'
  ON CONFLICT DO NOTHING;

  INSERT INTO department_members (user_id, department_id, role)
  SELECT u.id, women_ministry_dept_id, 'Leader'
  FROM users u
  WHERE u.email = 'worker72@example.invalid'
  ON CONFLICT DO NOTHING;

  INSERT INTO department_members (user_id, department_id, role)
  SELECT u.id, health_ministry_dept_id, 'Leader'
  FROM users u
  WHERE u.email = 'worker64@example.invalid'
  ON CONFLICT DO NOTHING;

  INSERT INTO department_members (user_id, department_id, role)
  SELECT u.id, family_life_dept_id, 'Leader'
  FROM users u
  WHERE u.email = 'worker62@example.invalid'
  ON CONFLICT DO NOTHING;

  INSERT INTO department_members (user_id, department_id, role)
  SELECT u.id, communication_dept_id, 'Communication Secretary'
  FROM users u
  WHERE u.email = 'worker67@example.invalid'
  ON CONFLICT DO NOTHING;

  INSERT INTO department_members (user_id, department_id, role)
  SELECT u.id, development_dept_id, 'Leader'
  FROM users u
  WHERE u.email = 'worker62@example.invalid'
  ON CONFLICT DO NOTHING;

  INSERT INTO department_members (user_id, department_id, role)
  SELECT u.id, welfare_dept_id, 'Leader'
  FROM users u
  WHERE u.email = 'worker71@example.invalid'
  ON CONFLICT DO NOTHING;
END $$;

-- Create some sample content for testing
INSERT INTO content_items (title, slug, content, content_type, category_id, author_id, status, published_at) VALUES
('Welcome to Kiserian Main SDA Church', 'welcome-to-kiserian-main-sda-church', 'We are delighted to welcome you to our church family. Join us for worship every Saturday.', 'page', (SELECT id FROM content_categories WHERE name = 'Announcements' LIMIT 1), (SELECT id FROM users WHERE email = 'worker02@example.invalid' LIMIT 1), 'published', CURRENT_TIMESTAMP),
('Weekly Sermon: Faith in Action', 'weekly-sermon-faith-in-action', 'This week we explore what it means to put our faith into action in our daily lives.', 'sermon', (SELECT id FROM content_categories WHERE name = 'Sermons' LIMIT 1), (SELECT id FROM users WHERE email = 'worker02@example.invalid' LIMIT 1), 'published', CURRENT_TIMESTAMP),
('Upcoming Church Events', 'upcoming-church-events', 'Join us for our upcoming events including the youth camp meeting and community outreach programs.', 'announcement', (SELECT id FROM content_categories WHERE name = 'Events' LIMIT 1), (SELECT id FROM users WHERE email = 'worker46@example.invalid' LIMIT 1), 'published', CURRENT_TIMESTAMP)
ON CONFLICT (slug) DO NOTHING;

-- Create sample gallery album
INSERT INTO gallery_albums (title, description, created_by) VALUES
('Church Services', 'Photos from our weekly church services', (SELECT id FROM users WHERE email = 'worker54@example.invalid' LIMIT 1)),
('Youth Events', 'Photos from youth ministry events and activities', (SELECT id FROM users WHERE email = 'worker48@example.invalid' LIMIT 1)),
('Community Outreach', 'Photos from our community service activities', (SELECT id FROM users WHERE email = 'worker08@example.invalid' LIMIT 1))
ON CONFLICT DO NOTHING;

-- Create sample church account
INSERT INTO church_accounts (account_name, account_number, bank_name, account_type, balance, currency) VALUES
('Main Church Account', '1234567890', 'KCB Bank', 'checking', 500000.00, 'KES'),
('Tithe Account', '0987654321', 'Equity Bank', 'savings', 250000.00, 'KES'),
('Mission Fund', '1122334455', 'Cooperative Bank', 'savings', 100000.00, 'KES')
ON CONFLICT (account_name) DO NOTHING;

-- Create sample transactions
INSERT INTO transactions (transaction_type, category_id, account_id, amount, description, transaction_date, recorded_by, status, payment_method) VALUES
('income', (SELECT id FROM income_categories WHERE code = 'TITHE' LIMIT 1), (SELECT id FROM church_accounts WHERE account_name = 'Tithe Account' LIMIT 1), 15000.00, 'Weekly tithes', CURRENT_DATE, (SELECT id FROM users WHERE email = 'worker41@example.invalid' LIMIT 1), 'approved', 'cash'),
('income', (SELECT id FROM income_categories WHERE code = 'OFFERING' LIMIT 1), (SELECT id FROM church_accounts WHERE account_name = 'Main Church Account' LIMIT 1), 25000.00, 'Sabbath offering', CURRENT_DATE, (SELECT id FROM users WHERE email = 'worker41@example.invalid' LIMIT 1), 'approved', 'cash'),
('expense', (SELECT id FROM expense_categories WHERE code = 'UTILITIES' LIMIT 1), (SELECT id FROM church_accounts WHERE account_name = 'Main Church Account' LIMIT 1), 5000.00, 'Electricity bill', CURRENT_DATE, (SELECT id FROM users WHERE email = 'worker41@example.invalid' LIMIT 1), 'approved', 'bank_transfer'),
('expense', (SELECT id FROM expense_categories WHERE code = 'MAINTENANCE' LIMIT 1), (SELECT id FROM church_accounts WHERE account_name = 'Main Church Account' LIMIT 1), 3000.00, 'Building maintenance', CURRENT_DATE, (SELECT id FROM users WHERE email = 'worker41@example.invalid' LIMIT 1), 'approved', 'cash')
ON CONFLICT DO NOTHING;

-- Create sample budget
INSERT INTO budgets (name, fiscal_year, start_date, end_date, total_income_budget, total_expense_budget, created_by, status) VALUES
('2024 Annual Budget', 2024, '2024-01-01', '2024-12-31', 1200000.00, 1000000.00, (SELECT id FROM users WHERE email = 'worker41@example.invalid' LIMIT 1), 'active')
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
((SELECT id FROM payment_methods WHERE name = 'M-Pesa' LIMIT 1), 5000.00, 'tithe', 'MP-2024-001', 'completed', CURRENT_TIMESTAMP, (SELECT id FROM users WHERE email = 'worker41@example.invalid' LIMIT 1), 'Tithe via M-Pesa'),
((SELECT id FROM payment_methods WHERE name = 'Cash' LIMIT 1), 2000.00, 'offering', 'CASH-2024-001', 'completed', CURRENT_TIMESTAMP, (SELECT id FROM users WHERE email = 'worker41@example.invalid' LIMIT 1), 'Sabbath offering'),
((SELECT id FROM payment_methods WHERE name = 'Bank Transfer' LIMIT 1), 10000.00, 'donation', 'BANK-2024-001', 'completed', CURRENT_TIMESTAMP, (SELECT id FROM users WHERE email = 'worker41@example.invalid' LIMIT 1), 'Building fund donation')
ON CONFLICT (reference_number) DO NOTHING;

-- Create sample pledges
INSERT INTO pledges (amount, pledge_type, start_date, end_date, frequency, status) VALUES
(50000.00, 'building', '2024-01-01', '2024-12-31', 'monthly', 'active'),
(25000.00, 'mission', '2024-01-01', '2024-12-31', 'quarterly', 'active'),
(10000.00, 'general', '2024-01-01', '2024-12-31', 'monthly', 'active')
ON CONFLICT DO NOTHING;

-- Create sample department meetings
INSERT INTO department_meetings (department_id, title, description, meeting_date, duration, location, organizer_id, status) VALUES
((SELECT id FROM departments WHERE name = 'Elders' LIMIT 1), 'Monthly Elders Meeting', 'Regular monthly meeting of the church elders council', CURRENT_DATE + INTERVAL '7 days', 120, 'Church Board Room', (SELECT id FROM users WHERE email = 'worker02@example.invalid' LIMIT 1), 'scheduled'),
((SELECT id FROM departments WHERE name = 'Deaconry' LIMIT 1), 'Deaconry Planning Meeting', 'Planning session for upcoming church activities', CURRENT_DATE + INTERVAL '3 days', 90, 'Church Hall', (SELECT id FROM users WHERE email = 'worker21@example.invalid' LIMIT 1), 'scheduled'),
((SELECT id FROM departments WHERE name = 'Youth Ministry' LIMIT 1), 'Youth Ministry Coordination', 'Monthly youth ministry coordination meeting', CURRENT_DATE + INTERVAL '5 days', 60, 'Youth Room', (SELECT id FROM users WHERE email = 'worker48@example.invalid' LIMIT 1), 'scheduled')
ON CONFLICT DO NOTHING;

-- Create sample department tasks
INSERT INTO department_tasks (department_id, title, description, assigned_to, assigned_by, due_date, priority, status) VALUES
((SELECT id FROM departments WHERE name = 'Elders' LIMIT 1), 'Review Church Budget', 'Review and approve the annual church budget', (SELECT id FROM users WHERE email = 'worker02@example.invalid' LIMIT 1), (SELECT id FROM users WHERE email = 'worker02@example.invalid' LIMIT 1), CURRENT_DATE + INTERVAL '14 days', 'high', 'pending'),
((SELECT id FROM departments WHERE name = 'Deaconry' LIMIT 1), 'Prepare for Sabbath Service', 'Ensure all preparations are made for the upcoming Sabbath service', (SELECT id FROM users WHERE email = 'worker21@example.invalid' LIMIT 1), (SELECT id FROM users WHERE email = 'worker21@example.invalid' LIMIT 1), CURRENT_DATE + INTERVAL '2 days', 'high', 'in_progress'),
((SELECT id FROM departments WHERE name = 'Youth Ministry' LIMIT 1), 'Plan Youth Camp', 'Plan and organize the upcoming youth camp meeting', (SELECT id FROM users WHERE email = 'worker48@example.invalid' LIMIT 1), (SELECT id FROM users WHERE email = 'worker48@example.invalid' LIMIT 1), CURRENT_DATE + INTERVAL '30 days', 'medium', 'pending')
ON CONFLICT DO NOTHING;

-- Create sample department resources
INSERT INTO department_resources (department_id, name, description, type, url, uploaded_by, is_public) VALUES
((SELECT id FROM departments WHERE name = 'Elders' LIMIT 1), 'Church Constitution', 'Official church constitution document', 'Document', '', (SELECT id FROM users WHERE email = 'worker46@example.invalid' LIMIT 1), true),
((SELECT id FROM departments WHERE name = 'Deaconry' LIMIT 1), 'Deaconry Handbook', 'Guidelines and procedures for deaconry ministry', 'Document', '', (SELECT id FROM users WHERE email = 'worker21@example.invalid' LIMIT 1), true),
((SELECT id FROM departments WHERE name = 'Youth Ministry' LIMIT 1), 'Youth Ministry Resources', 'Resources for youth ministry programs', 'Document', '', (SELECT id FROM users WHERE email = 'worker48@example.invalid' LIMIT 1), true)
ON CONFLICT DO NOTHING;