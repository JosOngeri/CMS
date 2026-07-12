-- Phase 14: Add AI Usage Audit Logging
-- Tracks AI API usage for monitoring and rate limiting

CREATE TABLE IF NOT EXISTS ai_usage_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    church_id UUID REFERENCES churches(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    endpoint VARCHAR(100) NOT NULL,
    model VARCHAR(50) DEFAULT 'gemini-pro',
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    cost DECIMAL(10, 6) DEFAULT 0.000000,
    status VARCHAR(20) DEFAULT 'success',
    error_message TEXT,
    request_metadata JSONB DEFAULT '{}',
    response_metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_usage_church ON ai_usage_logs(church_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_user ON ai_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_date ON ai_usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_usage_church_date ON ai_usage_logs(church_id, created_at);

-- Add rate limiting tracking table
CREATE TABLE IF NOT EXISTS ai_rate_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    church_id UUID REFERENCES churches(id) ON DELETE CASCADE,
    endpoint VARCHAR(100) NOT NULL,
    window_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    request_count INTEGER DEFAULT 0,
    max_requests INTEGER DEFAULT 100,
    reset_at TIMESTAMP,
    UNIQUE(church_id, endpoint, window_start)
);

CREATE INDEX IF NOT EXISTS idx_ai_rate_limits_church ON ai_rate_limits(church_id);
CREATE INDEX IF NOT EXISTS idx_ai_rate_limits_reset ON ai_rate_limits(reset_at);

-- Add function to check and update rate limits
CREATE OR REPLACE FUNCTION check_ai_rate_limit(p_church_id UUID, p_endpoint VARCHAR(100), p_max_requests INTEGER DEFAULT 100)
RETURNS TABLE(allowed BOOLEAN, remaining INTEGER, reset_at TIMESTAMP) AS $$
DECLARE
    v_window_start TIMESTAMP;
    v_current_count INTEGER;
    v_reset_at TIMESTAMP;
BEGIN
    -- Set window to current hour
    v_window_start := date_trunc('hour', CURRENT_TIMESTAMP);
    v_reset_at := v_window_start + INTERVAL '1 hour';
    
    -- Check if rate limit record exists for current window
    SELECT request_count INTO v_current_count
    FROM ai_rate_limits
    WHERE church_id = p_church_id 
      AND endpoint = p_endpoint 
      AND window_start = v_window_start;
    
    -- If no record exists, create one
    IF v_current_count IS NULL THEN
        INSERT INTO ai_rate_limits (church_id, endpoint, window_start, request_count, max_requests, reset_at)
        VALUES (p_church_id, p_endpoint, v_window_start, 1, p_max_requests, v_reset_at);
        v_current_count := 1;
    ELSE
        -- Increment count
        UPDATE ai_rate_limits
        SET request_count = request_count + 1
        WHERE church_id = p_church_id 
          AND endpoint = p_endpoint 
          AND window_start = v_window_start;
        v_current_count := v_current_count + 1;
    END IF;
    
    -- Return result
    RETURN QUERY SELECT 
        (v_current_count <= p_max_requests) as allowed,
        (p_max_requests - v_current_count) as remaining,
        v_reset_at;
END;
$$ LANGUAGE plpgsql;

-- Add function to log AI usage
CREATE OR REPLACE FUNCTION log_ai_usage(
    p_church_id UUID,
    p_user_id UUID,
    p_endpoint VARCHAR(100),
    p_model VARCHAR(100),
    p_input_tokens INTEGER,
    p_output_tokens INTEGER,
    p_status VARCHAR(20),
    p_error_message TEXT DEFAULT NULL,
    p_request_metadata JSONB DEFAULT '{}',
    p_response_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
    v_total_tokens INTEGER;
    v_cost DECIMAL(10, 6);
BEGIN
    v_total_tokens := p_input_tokens + p_output_tokens;
    
    -- Simple cost calculation (Gemini pricing: $0.000001 per token)
    v_cost := (v_total_tokens * 0.000001)::DECIMAL(10, 6);
    
    INSERT INTO ai_usage_logs (
        church_id, user_id, endpoint, model, 
        input_tokens, output_tokens, total_tokens, cost,
        status, error_message, request_metadata, response_metadata
    )
    VALUES (
        p_church_id, p_user_id, p_endpoint, p_model,
        p_input_tokens, p_output_tokens, v_total_tokens, v_cost,
        p_status, p_error_message, p_request_metadata, p_response_metadata
    )
    RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;
