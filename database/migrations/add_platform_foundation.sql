CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS platform_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('platform_owner', 'platform_admin', 'support')),
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    failed_login_attempts INTEGER NOT NULL DEFAULT 0 CHECK (failed_login_attempts >= 0),
    locked_until TIMESTAMP,
    last_login TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE platform_users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
ALTER TABLE platform_users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE platform_users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP;
ALTER TABLE platform_users ADD COLUMN IF NOT EXISTS permissions JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE platform_users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS platform_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stat_date DATE NOT NULL UNIQUE,
    total_churches INTEGER NOT NULL DEFAULT 0 CHECK (total_churches >= 0),
    active_churches INTEGER NOT NULL DEFAULT 0 CHECK (active_churches >= 0),
    total_mrr DECIMAL(12, 2) NOT NULL DEFAULT 0 CHECK (total_mrr >= 0),
    new_churches INTEGER NOT NULL DEFAULT 0 CHECK (new_churches >= 0),
    churned_churches INTEGER NOT NULL DEFAULT 0 CHECK (churned_churches >= 0),
    arpc DECIMAL(12, 2) NOT NULL DEFAULT 0 CHECK (arpc >= 0),
    platform_health_score DECIMAL(5, 2) NOT NULL DEFAULT 100 CHECK (platform_health_score BETWEEN 0 AND 100),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS platform_health (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_name VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('healthy', 'degraded', 'down')),
    response_time INTEGER CHECK (response_time >= 0),
    error_rate DECIMAL(5, 2) CHECK (error_rate BETWEEN 0 AND 100),
    last_check TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS platform_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
    message TEXT NOT NULL,
    service_affected VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    resolution_notes TEXT
);

CREATE TABLE IF NOT EXISTS platform_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES platform_users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id UUID,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_platform_users_email ON platform_users(email);
CREATE INDEX IF NOT EXISTS idx_platform_users_active_role ON platform_users(is_active, role);
CREATE INDEX IF NOT EXISTS idx_platform_health_service_check ON platform_health(service_name, last_check DESC);
CREATE INDEX IF NOT EXISTS idx_platform_alerts_status_created ON platform_alerts(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_audit_logs_user_created ON platform_audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_audit_logs_resource ON platform_audit_logs(resource_type, resource_id, created_at DESC);
