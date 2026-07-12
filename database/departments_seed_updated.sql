-- Updated Church Departments Seed for SDA Church Kiserian Main
-- Based on the provided department list

-- Clear existing departments (optional - uncomment if needed)
-- DELETE FROM departments;

-- Insert departments based on the updated church structure
INSERT INTO departments (name, description, category, leader_name) VALUES
-- Leadership
('Elders', 'Church Elders Council', 'Leadership', 'George Ng''ang''a'),
('Deaconry', 'Deacons and Deaconesses', 'Leadership', 'Kennedy Mbatia'),
('Treasurer', 'Church Financial Management', 'Leadership', 'Elizabeth Mboya'),
('Church Clerk', 'Church Records and Administration', 'Leadership', 'Esther Okemwa'),
('Interest Coordinator', 'New Member Interests', 'Leadership', 'Ken Okoth'),

-- Ministries
('Dorcas Ministry', 'Dorcas Ministry Programs', 'Ministry', 'Julian Maihanyu'),
('Adventist Men Ministry', 'Men Ministry Programs', 'Ministry', 'Okemwa Ogwoka'),
('Adventist Possibility Ministry', 'Possibility Ministry Programs', 'Ministry', 'Millicent Okoth'),
('Youth Ministry', 'Youth Programs and Activities', 'Ministry', 'Mitchel Chabari'),
('Children Ministry', 'Children Programs and Education', 'Ministry', 'Elizabeth Magembe'),
('Personal Ministry', 'Personal Evangelism', 'Ministry', 'Thomas Gichinga'),
('Publishing Ministry', 'Publishing and Literature', 'Ministry', 'Monicah Ndung''u'),
('Evangelism Department', 'Evangelism Programs', 'Ministry', 'Stephen Ng''ang''a'),
('Stewardship Ministry', 'Stewardship Programs', 'Ministry', 'George Ng''ang''a'),
('Adventist Women Ministry', 'Women Ministry Programs', 'Ministry', 'Eucabeth Chacha'),
('Health Ministry', 'Health and Wellness Programs', 'Ministry', 'Raphael Mahianyu'),
('Family Life Ministry', 'Family Programs and Counseling', 'Ministry', 'Gerald Magati'),
('Prayer Ministry', 'Prayer Programs', 'Ministry', 'Edith Wachira'),
('Religious Liberty Ministry', 'Religious Liberty Programs', 'Ministry', 'George Ng''ang''a'),
('Nurture and Retention Ministry', 'Member Nurturing', 'Ministry', 'Henry Mokaya'),

-- Youth Programs
('Adventurer Club', 'Adventurer Programs', 'Youth', 'Casper Lewis'),
('Ambassadors Ministry', 'Ambassador Programs', 'Youth', 'Nancy Gathoni'),
('Vacation Bible School (VBS)', 'Vacation Bible School', 'Youth', 'Mary Benson'),
('Kids in Discipleship (KID)', 'Kids in Discipleship Program', 'Youth', NULL),

-- Music and Worship
('Music Ministry', 'Church Music and Choir', 'Ministry', 'George Ochogo'),
('Choristers', 'Church Choir', 'Ministry', 'Maureen Ochogo'),
('Church Choir', 'Main Church Choir', 'Ministry', 'Linet Okemwa'),
('Pianists', 'Piano and Keyboard', 'Ministry', 'Sammy Mureithi'),
('PA System Team', 'Sound and Audio', 'Ministry', 'James Ogato'),

-- Education
('Education Department', 'Church Education Programs', 'Education', 'Abel Nyakundi'),
('Sabbath School', 'Sabbath School Programs', 'Education', 'Kirsten Gathogo'),
('Library', 'Church Library', 'Education', 'Moses Magembe'),
('School Committee', 'Church School Management', 'Education', 'Moses Magembe'),
('V.O.P./S.O.P.', 'Voice of Prophecy/School of Prophets', 'Education', 'Mbatia Njoroge'),

-- Pathfinder
('Pathfinder Club', 'Pathfinder Programs', 'Youth', 'Rhoda Mabiria'),

-- Special Programs
('Camp Meeting Committee', 'Camp Meeting Organization', 'Special', 'Benard Chieng''a'),
('Development Department', 'Church Development Projects', 'Special', 'Gerald Magati'),
('Welfare Department', 'Church Welfare Programs', 'Special', 'Gladys Kimori'),
('Annah''s Family Ministry', 'Family Ministry Programs', 'Special', NULL),
('Chaplaincy', 'Church Chaplaincy Services', 'Special', NULL),
('Master Guide Ministry', 'Master Guide Programs', 'Special', NULL),

-- Communication
('Communication Department', 'Church Communications', 'Support', 'Josiah Omesa');
