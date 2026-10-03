-- Updated Church Departments Seed for SDA Church Kiserian Main
-- Based on the provided department list

-- Clear existing departments (optional - uncomment if needed)
-- DELETE FROM departments;

-- Insert departments based on the updated church structure
INSERT INTO departments (name, description, category, leader_name) VALUES
-- Leadership
('Elders', 'Church Elders Council', 'Leadership', NULL),
('Deaconry', 'Deacons and Deaconesses', 'Leadership', NULL),
('Treasurer', 'Church Financial Management', 'Leadership', NULL),
('Church Clerk', 'Church Records and Administration', 'Leadership', NULL),
('Interest Coordinator', 'New Member Interests', 'Leadership', NULL),

-- Ministries
('Dorcas Ministry', 'Dorcas Ministry Programs', 'Ministry', NULL),
('Adventist Men Ministry', 'Men Ministry Programs', 'Ministry', NULL),
('Adventist Possibility Ministry', 'Possibility Ministry Programs', 'Ministry', NULL),
('Youth Ministry', 'Youth Programs and Activities', 'Ministry', NULL),
('Children Ministry', 'Children Programs and Education', 'Ministry', NULL),
('Personal Ministry', 'Personal Evangelism', 'Ministry', NULL),
('Publishing Ministry', 'Publishing and Literature', 'Ministry', NULL),
('Evangelism Department', 'Evangelism Programs', 'Ministry', NULL),
('Stewardship Ministry', 'Stewardship Programs', 'Ministry', NULL),
('Adventist Women Ministry', 'Women Ministry Programs', 'Ministry', NULL),
('Health Ministry', 'Health and Wellness Programs', 'Ministry', NULL),
('Family Life Ministry', 'Family Programs and Counseling', 'Ministry', NULL),
('Prayer Ministry', 'Prayer Programs', 'Ministry', NULL),
('Religious Liberty Ministry', 'Religious Liberty Programs', 'Ministry', NULL),
('Nurture and Retention Ministry', 'Member Nurturing', 'Ministry', NULL),

-- Youth Programs
('Adventurer Club', 'Adventurer Programs', 'Youth', NULL),
('Ambassadors Ministry', 'Ambassador Programs', 'Youth', NULL),
('Vacation Bible School (VBS)', 'Vacation Bible School', 'Youth', NULL),
('Kids in Discipleship (KID)', 'Kids in Discipleship Program', 'Youth', NULL),

-- Music and Worship
('Music Ministry', 'Church Music and Choir', 'Ministry', NULL),
('Choristers', 'Church Choir', 'Ministry', NULL),
('Church Choir', 'Main Church Choir', 'Ministry', NULL),
('Pianists', 'Piano and Keyboard', 'Ministry', NULL),
('PA System Team', 'Sound and Audio', 'Ministry', NULL),

-- Education
('Education Department', 'Church Education Programs', 'Education', NULL),
('Sabbath School', 'Sabbath School Programs', 'Education', NULL),
('Library', 'Church Library', 'Education', NULL),
('School Committee', 'Church School Management', 'Education', NULL),
('V.O.P./S.O.P.', 'Voice of Prophecy/School of Prophets', 'Education', NULL),

-- Pathfinder
('Pathfinder Club', 'Pathfinder Programs', 'Youth', NULL),

-- Special Programs
('Camp Meeting Committee', 'Camp Meeting Organization', 'Special', NULL),
('Development Department', 'Church Development Projects', 'Special', NULL),
('Welfare Department', 'Church Welfare Programs', 'Special', NULL),
('Annah''s Family Ministry', 'Family Ministry Programs', 'Special', NULL),
('Chaplaincy', 'Church Chaplaincy Services', 'Special', NULL),
('Master Guide Ministry', 'Master Guide Programs', 'Special', NULL),

-- Communication
('Communication Department', 'Church Communications', 'Support', NULL);
