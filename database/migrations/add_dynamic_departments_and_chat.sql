-- Phase 8: Dynamic Departments & Phase 10: Chat
-- Functional Building Blocks and Real-time Communication

-- 1. Department Features Registry
CREATE TABLE IF NOT EXISTS department_features (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    component_name VARCHAR(100), -- Frontend component mapping
    icon_name VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Feature Allocation (Per Church/Tenant)
CREATE TABLE IF NOT EXISTS feature_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    church_id UUID REFERENCES churches(id) ON DELETE CASCADE,
    feature_id UUID REFERENCES department_features(id) ON DELETE CASCADE,
    is_enabled BOOLEAN DEFAULT true,
    config JSONB DEFAULT '{}',
    UNIQUE(church_id, feature_id)
);

-- 3. Chat Infrastructure
CREATE TABLE IF NOT EXISTS chat_rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    church_id UUID REFERENCES churches(id) ON DELETE CASCADE,
    name VARCHAR(100),
    type VARCHAR(20) DEFAULT 'group', -- 'private', 'group', 'department'
    department_id UUID, -- Optional: link to department
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text', -- 'text', 'file', 'system', 'slash_command'
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Seed Initial Features
INSERT INTO department_features (slug, name, description, icon_name) VALUES
('MEMBERSHIP', 'Membership Management', 'Core member records and attendance', 'Users'),
('TREASURY', 'Treasury & Reconciliation', 'Financial tracking and M-Pesa sync', 'DollarSign'),
('SMS_CENTER', 'SMS Hub', 'Bulk messaging and relay status', 'MessageSquare'),
('GALLERY', 'Media Gallery', 'Telegram-synced media and history', 'Image'),
('EVENTS', 'Event Planning', 'Logistics and registration', 'Calendar'),
('AI_ASSISTANT', 'AI Content Tool', 'Gemini-powered condensation', 'Cpu'),
('CHAT', 'Internal Messenger', 'Departmental real-time chat', 'MessageCircle')
ON CONFLICT (slug) DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_room ON chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_feature_alloc_church ON feature_allocations(church_id);
