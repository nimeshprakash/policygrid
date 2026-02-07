-- InsurePulse Database Schema
-- PostgreSQL 14+

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    country VARCHAR(2) DEFAULT 'BH',
    plan VARCHAR(50) DEFAULT 'starter',
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);

-- Policies table
CREATE TABLE policies (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    policy_number VARCHAR(100) NOT NULL,
    insured_name VARCHAR(255) NOT NULL,
    premium DECIMAL(15, 2) NOT NULL,
    premium_bhd DECIMAL(15, 2),
    effective_date DATE NOT NULL,
    expiration_date DATE NOT NULL,
    line_of_business VARCHAR(100) NOT NULL,
    country VARCHAR(2) NOT NULL,
    insurance_type VARCHAR(50) DEFAULT 'conventional', -- 'conventional' or 'takaful'
    status VARCHAR(20) DEFAULT 'active',
    property_location_lat DECIMAL(10, 8),
    property_location_lng DECIMAL(11, 8),
    coverage_limits JSONB,
    deductible DECIMAL(15, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, policy_number)
);

CREATE INDEX idx_policies_user ON policies(user_id);
CREATE INDEX idx_policies_status ON policies(status);
CREATE INDEX idx_policies_country ON policies(country);
CREATE INDEX idx_policies_lob ON policies(line_of_business);
CREATE INDEX idx_policies_expiration ON policies(expiration_date);
CREATE INDEX idx_policies_insurance_type ON policies(insurance_type);

-- Claims table
CREATE TABLE claims (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    policy_id INTEGER REFERENCES policies(id) ON DELETE CASCADE,
    claim_number VARCHAR(100) NOT NULL,
    loss_date DATE NOT NULL,
    reported_date DATE NOT NULL,
    loss_type VARCHAR(100),
    paid_amount DECIMAL(15, 2) DEFAULT 0,
    reserve_amount DECIMAL(15, 2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'open',
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, claim_number)
);

CREATE INDEX idx_claims_user ON claims(user_id);
CREATE INDEX idx_claims_policy ON claims(policy_id);
CREATE INDEX idx_claims_status ON claims(status);
CREATE INDEX idx_claims_loss_date ON claims(loss_date);

-- Demo requests table
CREATE TABLE demo_requests (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    job_title VARCHAR(255),
    company_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    whatsapp VARCHAR(50),
    policy_count VARCHAR(50),
    countries VARCHAR(255),
    lines_of_business JSONB,
    referral_source VARCHAR(100),
    message TEXT,
    selected_plan VARCHAR(50),
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    contacted_at TIMESTAMP,
    notes TEXT
);

CREATE INDEX idx_demo_status ON demo_requests(status);
CREATE INDEX idx_demo_created ON demo_requests(created_at DESC);

-- AI queries log table
CREATE TABLE ai_queries (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    query TEXT NOT NULL,
    response TEXT,
    processing_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ai_queries_user ON ai_queries(user_id);
CREATE INDEX idx_ai_queries_created ON ai_queries(created_at DESC);

-- Takaful specific data
CREATE TABLE takaful_accounts (
    id SERIAL PRIMARY KEY,
    policy_id INTEGER REFERENCES policies(id) ON DELETE CASCADE,
    contribution_amount DECIMAL(15, 2),
    wakala_fee_percentage DECIMAL(5, 2),
    surplus_sharing_ratio DECIMAL(5, 2),
    tabarru_fund_balance DECIMAL(15, 2) DEFAULT 0,
    shariah_board_approval_ref VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_takaful_policy ON takaful_accounts(policy_id);

-- Activity log
CREATE TABLE activity_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    activity_type VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50), -- 'policy', 'claim', 'renewal', etc.
    entity_id INTEGER,
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_activity_user ON activity_log(user_id);
CREATE INDEX idx_activity_type ON activity_log(activity_type);
CREATE INDEX idx_activity_created ON activity_log(created_at DESC);

-- Portfolio analytics (pre-computed for performance)
CREATE TABLE portfolio_analytics (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    report_date DATE NOT NULL,
    total_premium DECIMAL(15, 2),
    total_premium_bhd DECIMAL(15, 2),
    policy_count INTEGER,
    loss_ratio DECIMAL(5, 4),
    combined_ratio DECIMAL(5, 4),
    takaful_percentage DECIMAL(5, 4),
    by_country JSONB,
    by_line JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, report_date)
);

CREATE INDEX idx_analytics_user ON portfolio_analytics(user_id);
CREATE INDEX idx_analytics_date ON portfolio_analytics(report_date DESC);

-- Regulatory reports tracking
CREATE TABLE regulatory_reports (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    country VARCHAR(2) NOT NULL,
    regulator VARCHAR(100), -- 'CBB', 'SAMA', 'UAE_IA', etc.
    report_type VARCHAR(100),
    reporting_period VARCHAR(50),
    due_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    filed_date DATE,
    file_reference VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_regulatory_user ON regulatory_reports(user_id);
CREATE INDEX idx_regulatory_due_date ON regulatory_reports(due_date);
CREATE INDEX idx_regulatory_status ON regulatory_reports(status);

-- File uploads tracking
CREATE TABLE file_uploads (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50),
    file_size INTEGER,
    storage_path VARCHAR(500),
    record_count INTEGER,
    processing_status VARCHAR(50) DEFAULT 'pending',
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP
);

CREATE INDEX idx_uploads_user ON file_uploads(user_id);
CREATE INDEX idx_uploads_status ON file_uploads(processing_status);
CREATE INDEX idx_uploads_created ON file_uploads(created_at DESC);

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_policies_updated_at BEFORE UPDATE ON policies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_claims_updated_at BEFORE UPDATE ON claims
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_takaful_updated_at BEFORE UPDATE ON takaful_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_regulatory_updated_at BEFORE UPDATE ON regulatory_reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Views for common queries

-- User portfolio summary view
CREATE VIEW v_user_portfolio_summary AS
SELECT 
    u.id as user_id,
    u.company_name,
    u.country,
    COUNT(p.id) as policy_count,
    SUM(p.premium) as total_premium,
    SUM(CASE WHEN p.insurance_type = 'takaful' THEN p.premium ELSE 0 END) as takaful_premium,
    COUNT(DISTINCT p.country) as countries_count,
    COUNT(DISTINCT p.line_of_business) as lines_count
FROM users u
LEFT JOIN policies p ON u.id = p.user_id AND p.status = 'active'
GROUP BY u.id, u.company_name, u.country;

-- Loss ratio by line of business view
CREATE VIEW v_loss_ratio_by_line AS
SELECT 
    p.user_id,
    p.line_of_business,
    COUNT(p.id) as policy_count,
    SUM(p.premium) as total_premium,
    SUM(c.paid_amount + c.reserve_amount) as total_losses,
    CASE 
        WHEN SUM(p.premium) > 0 
        THEN SUM(c.paid_amount + c.reserve_amount) / SUM(p.premium)
        ELSE 0 
    END as loss_ratio
FROM policies p
LEFT JOIN claims c ON p.id = c.policy_id
WHERE p.status = 'active'
GROUP BY p.user_id, p.line_of_business;

-- Seed data for testing (optional)
-- INSERT INTO users (email, password, company_name, full_name, country, plan) 
-- VALUES ('demo@insurepulse.me', '$2a$10$...', 'Demo Insurance Co', 'Demo User', 'BH', 'professional');

-- Grant permissions (adjust as needed)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO insurepulse_app;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO insurepulse_app;