-- Church Departments Schema for SDA Church Kiserian Main
-- Based on the Church workers list with departments

-- Departments table
CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    category VARCHAR(50), -- Leadership, Ministry, Support, etc.
    leader_name VARCHAR(100),
    leader_contact VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Department members table
CREATE TABLE IF NOT EXISTS department_members (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    department_id INTEGER REFERENCES departments(id) ON DELETE CASCADE,
    role VARCHAR(50), -- Leader, Assistant, Member, Secretary, etc.
    is_active BOOLEAN DEFAULT true,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, department_id)
);

-- Department communications table
CREATE TABLE IF NOT EXISTS department_communications (
    id SERIAL PRIMARY KEY,
    department_id INTEGER REFERENCES departments(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50), -- Announcement, Meeting, Report, etc.
    priority VARCHAR(20) DEFAULT 'normal', -- urgent, high, normal, low
    sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- Department meetings table
CREATE TABLE IF NOT EXISTS department_meetings (
    id SERIAL PRIMARY KEY,
    department_id INTEGER REFERENCES departments(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    meeting_date TIMESTAMP NOT NULL,
    duration INTEGER, -- in minutes
    location VARCHAR(200),
    organizer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'scheduled', -- scheduled, completed, cancelled
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Department meeting attendees
CREATE TABLE IF NOT EXISTS department_meeting_attendees (
    id SERIAL PRIMARY KEY,
    meeting_id INTEGER REFERENCES department_meetings(id) ON DELETE CASCADE,
    member_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'invited', -- invited, confirmed, attended, absent
    response_time TIMESTAMP,
    UNIQUE(meeting_id, member_id)
);

-- Department reports table
CREATE TABLE IF NOT EXISTS department_reports (
    id SERIAL PRIMARY KEY,
    department_id INTEGER REFERENCES departments(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    report_type VARCHAR(50), -- Monthly, Quarterly, Annual, Special
    content TEXT,
    file_url VARCHAR(500),
    submitted_by INTEGER REFERENCES users(id) ON DELETE CASCADE,
    submission_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    period_start DATE,
    period_end DATE,
    status VARCHAR(20) DEFAULT 'submitted' -- submitted, reviewed, approved
);

-- Department tasks table
CREATE TABLE IF NOT EXISTS department_tasks (
    id SERIAL PRIMARY KEY,
    department_id INTEGER REFERENCES departments(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    assigned_to INTEGER REFERENCES users(id) ON DELETE CASCADE,
    assigned_by INTEGER REFERENCES users(id) ON DELETE CASCADE,
    due_date TIMESTAMP,
    priority VARCHAR(20) DEFAULT 'normal',
    status VARCHAR(20) DEFAULT 'pending', -- pending, in_progress, completed, cancelled
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Department resources table
CREATE TABLE IF NOT EXISTS department_resources (
    id SERIAL PRIMARY KEY,
    department_id INTEGER REFERENCES departments(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    type VARCHAR(50), -- Document, Video, Audio, Link, etc.
    url VARCHAR(500),
    file_path VARCHAR(500),
    uploaded_by INTEGER REFERENCES users(id) ON DELETE CASCADE,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_public BOOLEAN DEFAULT false
);

-- Insert departments based on the church structure
INSERT INTO departments (name, description, category, leader_name) VALUES
-- Leadership
('Elders', 'Church Elders Council', 'Leadership', 'George Ng’ang’a'),
('Deaconry', 'Deacons and Deaconesses', 'Leadership', 'Kennedy Mbatia'),
('Treasurer', 'Church Financial Management', 'Leadership', 'Elizabeth Mboya'),
('Church Clerk', 'Church Records and Administration', 'Leadership', 'Esther Okemwa'),

-- Ministries
('Youth Ministry', 'Youth Programs and Activities', 'Ministry', 'Mitchel Chabari'),
('Children Ministry', 'Children Programs and Education', 'Ministry', 'Elizabeth Magembe'),
('Adventist Men Ministry', 'Men Ministry Programs', 'Ministry', 'Okemwa Ogwoka'),
('Adventist Women Ministry', 'Women Ministry Programs', 'Ministry', 'Eucabeth Chacha'),
('Adventist Possibility Ministry', 'Possibility Ministry Programs', 'Ministry', 'Millicent Okoth'),
('Health Ministry', 'Health and Wellness Programs', 'Ministry', 'Raphael Mahianyu'),
('Family Life', 'Family Programs and Counseling', 'Ministry', 'Gerald Magati'),

-- Music and Worship
('Music Ministry', 'Church Music and Choir', 'Ministry', 'George Ochogo'),
('Choristers', 'Church Choir', 'Ministry', 'Maureen Ochogo'),
('Church Choir', 'Main Church Choir', 'Ministry', 'Linet Okemwa'),
('Pianist', 'Piano and Keyboard', 'Ministry', 'Sammy Mureithi'),
('PA System', 'Sound and Audio', 'Ministry', 'James Ogato'),

-- Sabbath School
('Sabbath School', 'Sabbath School Programs', 'Education', 'Kirsten Gathogo'),
('Education', 'Church Education Programs', 'Education', 'Abel Nyakundi'),

-- Youth Programs
('Adventurer Club', 'Adventurer Programs', 'Youth', 'Casper Lewis'),
('Ambassadors', 'Ambassador Programs', 'Youth', 'Nancy Gathoni'),
('Pathfinder', 'Pathfinder Programs', 'Youth', 'Rhoda Mabiria'),
('VBS', 'Vacation Bible School', 'Youth', 'Mary Benson'),

-- Support Ministries
('Dorcas', 'Dorcas Ministry', 'Support', 'Julian Maihanyu'),
('Personal Ministry', 'Personal Evangelism', 'Ministry', 'Thomas Gichinga'),
('Publishing', 'Publishing and Literature', 'Ministry', 'Monicah Ndung’u'),
('Evangelism', 'Evangelism Programs', 'Ministry', 'Stephen Ng’ang’a'),
('Stewardship', 'Stewardship Programs', 'Ministry', 'George Ng’ang’a'),

-- Special Programs
('Camp Meeting', 'Camp Meeting Organization', 'Special', 'Benard Chieng’a'),
('Development', 'Church Development Projects', 'Special', 'Gerald Magati'),
('Welfare', 'Church Welfare Programs', 'Special', 'Gladys Kimori'),
('Interest Coordinator', 'New Member Interests', 'Special', 'Ken Okoth'),

-- Communication
('Communication Secretary', 'Church Communications', 'Support', 'Josiah Omesa'),
('V.O.P./S.O.P.', 'Voice of Prophecy/School of Prophets', 'Education', 'Mbatia Njoroge'),

-- Other Ministries
('Prayer Ministry', 'Prayer Programs', 'Ministry', 'Edith Wachira'),
('Religious Liberty', 'Religious Liberty Programs', 'Ministry', 'George Ng’ang’a'),
('Nurture and Retention', 'Member Nurturing', 'Ministry', 'Henry Mokaya'),
('Library', 'Church Library', 'Education', 'Moses Magembe'),
('School Chair', 'Church School Management', 'Education', 'Moses Magembe');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_departments_category ON departments(category);
CREATE INDEX IF NOT EXISTS idx_department_members_user_id ON department_members(user_id);
CREATE INDEX IF NOT EXISTS idx_department_members_department_id ON department_members(department_id);
CREATE INDEX IF NOT EXISTS idx_department_communications_department_id ON department_communications(department_id);
CREATE INDEX IF NOT EXISTS idx_department_communications_sent_at ON department_communications(sent_at);
CREATE INDEX IF NOT EXISTS idx_department_meetings_department_id ON department_meetings(department_id);
CREATE INDEX IF NOT EXISTS idx_department_meetings_meeting_date ON department_meetings(meeting_date);
CREATE INDEX IF NOT EXISTS idx_department_reports_department_id ON department_reports(department_id);
CREATE INDEX IF NOT EXISTS idx_department_tasks_department_id ON department_tasks(department_id);
CREATE INDEX IF NOT EXISTS idx_department_tasks_assigned_to ON department_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_department_resources_department_id ON department_resources(department_id);
