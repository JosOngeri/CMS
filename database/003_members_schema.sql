-- MEMBERS Module Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Members table
CREATE TABLE IF NOT EXISTS members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  membership_number VARCHAR(50) UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  date_of_birth DATE,
  gender VARCHAR(20),
  marital_status VARCHAR(30),
  occupation VARCHAR(100),
  address TEXT,
  city VARCHAR(100),
  phone VARCHAR(20),
  email VARCHAR(255),
  baptism_date DATE,
  membership_status VARCHAR(30) DEFAULT 'active',
  joined_date DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Member contacts (additional contact info)
CREATE TABLE IF NOT EXISTS member_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  contact_type VARCHAR(50) NOT NULL,
  contact_value VARCHAR(255) NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Member groups (Sabbath school, ministry groups, etc.)
CREATE TABLE IF NOT EXISTS member_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  group_type VARCHAR(50),
  leader_id UUID REFERENCES members(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Member group memberships
CREATE TABLE IF NOT EXISTS member_group_memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  group_id UUID REFERENCES member_groups(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member',
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(member_id, group_id)
);

-- Member attendance
CREATE TABLE IF NOT EXISTS member_attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  service_date DATE NOT NULL,
  service_type VARCHAR(50),
  attended BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Member pledges
CREATE TABLE IF NOT EXISTS member_pledges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  pledge_type VARCHAR(50),
  amount DECIMAL(10, 2),
  frequency VARCHAR(30),
  start_date DATE,
  end_date DATE,
  status VARCHAR(30) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_members_status ON members(membership_status);
CREATE INDEX IF NOT EXISTS idx_members_joined ON members(joined_date);
CREATE INDEX IF NOT EXISTS idx_member_contacts_member ON member_contacts(member_id);
CREATE INDEX IF NOT EXISTS idx_member_group_memberships_member ON member_group_memberships(member_id);
CREATE INDEX IF NOT EXISTS idx_member_group_memberships_group ON member_group_memberships(group_id);
CREATE INDEX IF NOT EXISTS idx_member_attendance_member ON member_attendance(member_id);
CREATE INDEX IF NOT EXISTS idx_member_attendance_date ON member_attendance(service_date);
CREATE INDEX IF NOT EXISTS idx_member_pledges_member ON member_pledges(member_id);
