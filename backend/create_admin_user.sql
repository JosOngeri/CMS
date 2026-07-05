-- Create admin user with password: right123
-- First, ensure roles exist
INSERT INTO roles (name, description) VALUES 
  ('Super Admin', 'Full system access'),
  ('Pastor', 'Church pastor with administrative access'),
  ('First Elder', 'Church elder with administrative access'),
  ('Member', 'Regular church member')
ON CONFLICT (name) DO NOTHING;

-- Create admin user with a temporary password hash
-- You will need to reset the password after first login
INSERT INTO users (email, password_hash, first_name, last_name, username, is_active, email_verified)
VALUES (
  'admin@kiseriansda.org',
  '$2a$08$placeholder_hash_will_be_replaced',
  'Admin',
  'User',
  'admin',
  true,
  true
)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  is_active = true,
  email_verified = true;

-- Assign Super Admin role to admin user
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id 
FROM users u, roles r 
WHERE u.email = 'admin@kiseriansda.org' AND r.name = 'Super Admin'
ON CONFLICT (user_id, role_id) DO NOTHING;
