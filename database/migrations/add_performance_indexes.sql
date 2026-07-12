-- Performance Optimization Indexes
-- This migration adds indexes to improve query performance

-- Announcements indexes
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON announcements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_author_id ON announcements(author_id);
CREATE INDEX IF NOT EXISTS idx_announcements_is_published ON announcements(is_published);
CREATE INDEX IF NOT EXISTS idx_announcements_type ON announcements(announcement_type);
CREATE INDEX IF NOT EXISTS idx_announcements_status ON announcements(status);

-- Events indexes
CREATE INDEX IF NOT EXISTS idx_events_event_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_is_public ON events(is_public);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at DESC);

-- Payments indexes
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_category ON payments(category);
CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON payments(transaction_id);

-- Documents indexes
CREATE INDEX IF NOT EXISTS idx_documents_approval_status ON documents(approval_status);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_department_id ON documents(department_id);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at DESC);

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_department_id ON users(department_id);

-- Members indexes
CREATE INDEX IF NOT EXISTS idx_members_user_id ON members(user_id);
CREATE INDEX IF NOT EXISTS idx_members_status ON members(status);
CREATE INDEX IF NOT EXISTS idx_members_department_id ON members(department_id);

-- Departments indexes
CREATE INDEX IF NOT EXISTS idx_departments_is_active ON departments(is_active);

-- SMS providers indexes
CREATE INDEX IF NOT EXISTS idx_sms_providers_is_active ON sms_providers(is_active);
CREATE INDEX IF NOT EXISTS idx_sms_providers_priority ON sms_providers(priority);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);

-- Document approvals indexes
CREATE INDEX IF NOT EXISTS idx_document_approvals_status ON document_approvals(status);
CREATE INDEX IF NOT EXISTS idx_document_approvals_document_id ON document_approvals(document_id);
CREATE INDEX IF NOT EXISTS idx_document_approvals_approver_id ON document_approvals(approver_id);

-- Gallery indexes
CREATE INDEX IF NOT EXISTS idx_gallery_albums_created_at ON gallery_albums(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gallery_photos_album_id ON gallery_photos(album_id);
CREATE INDEX IF NOT EXISTS idx_gallery_sync_status ON gallery_sync_status(sync_status);

-- Payment tracking indexes
CREATE INDEX IF NOT EXISTS idx_payment_tracking_transaction_id ON payment_tracking(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payment_tracking_status ON payment_tracking(status);
CREATE INDEX IF NOT EXISTS idx_payment_tracking_created_at ON payment_tracking(created_at DESC);

-- Comment on indexes
COMMENT ON INDEX idx_announcements_created_at IS 'Index for sorting announcements by creation date';
COMMENT ON INDEX idx_events_event_date IS 'Index for querying events by date';
COMMENT ON INDEX idx_payments_user_id IS 'Index for user payment history queries';
COMMENT ON INDEX idx_documents_approval_status IS 'Index for filtering documents by approval status';
