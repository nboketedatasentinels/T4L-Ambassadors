-- ============================================
-- SHARED IMPACT EVENTS & AGGREGATED IMPACT TRACKING
-- Migration: Create impact_events, event_participants, impact_entries tables
-- ============================================

-- Enable UUID extension (if not already)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. IMPACT_EVENTS TABLE
-- Stores shared impact events created by Ambassadors/Partners/Admins
-- ============================================
CREATE TABLE IF NOT EXISTS impact_events (
    event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_by UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    creator_role VARCHAR(20) NOT NULL CHECK (creator_role IN ('ambassador', 'partner', 'admin')),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    esg_category VARCHAR(20) NOT NULL CHECK (esg_category IN ('environmental', 'social', 'governance')),
    total_impact_value NUMERIC(12,2) NOT NULL DEFAULT 0,
    impact_unit VARCHAR(100) NOT NULL DEFAULT 'people',
    event_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    expected_participants INTEGER DEFAULT NULL,
    evidence_link TEXT DEFAULT NULL,
    external_verifier_email VARCHAR(255) DEFAULT NULL,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    verification_level VARCHAR(20) DEFAULT 'tier_2' CHECK (verification_level IN ('tier_1', 'tier_2', 'tier_3', 'tier_4')),
    verification_multiplier NUMERIC(3,2) DEFAULT 1.5,
    hours_contributed NUMERIC(8,2) DEFAULT 0,
    usd_value NUMERIC(12,2) DEFAULT 0,
    share_externally BOOLEAN DEFAULT TRUE,
    participation_link TEXT DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_impact_events_created_by ON impact_events(created_by);
CREATE INDEX IF NOT EXISTS idx_impact_events_status ON impact_events(status);
CREATE INDEX IF NOT EXISTS idx_impact_events_esg_category ON impact_events(esg_category);
CREATE INDEX IF NOT EXISTS idx_impact_events_event_date ON impact_events(event_date DESC);
CREATE INDEX IF NOT EXISTS idx_impact_events_creator_role ON impact_events(creator_role);

-- ============================================
-- 2. EVENT_PARTICIPANTS TABLE
-- Tracks who participated in each shared impact event
-- ============================================
CREATE TABLE IF NOT EXISTS event_participants (
    participant_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES impact_events(event_id) ON DELETE CASCADE,
    user_id UUID DEFAULT NULL REFERENCES users(user_id) ON DELETE SET NULL,
    participant_type VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (participant_type IN ('user', 'anonymous')),
    anonymous_hash VARCHAR(255) DEFAULT NULL,
    display_name VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Unique constraint: each user can only participate once per event
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_participants_user_event 
    ON event_participants(event_id, user_id) WHERE user_id IS NOT NULL;

-- Unique constraint: each anonymous hash can only participate once per event
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_participants_anon_event 
    ON event_participants(event_id, anonymous_hash) WHERE anonymous_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_event_participants_event_id ON event_participants(event_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_user_id ON event_participants(user_id);

-- ============================================
-- 3. IMPACT_ENTRIES TABLE
-- Individual impact log entries (both standalone and derived from events)
-- ============================================
CREATE TABLE IF NOT EXISTS impact_entries (
    entry_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    user_role VARCHAR(20) NOT NULL CHECK (user_role IN ('user', 'ambassador', 'partner', 'admin')),
    
    -- Entry type: 'individual' for standalone, 'event_master' for event creator, 'event_derived' for participant
    entry_type VARCHAR(20) NOT NULL DEFAULT 'individual' CHECK (entry_type IN ('individual', 'event_master', 'event_derived')),
    event_id UUID DEFAULT NULL REFERENCES impact_events(event_id) ON DELETE CASCADE,
    
    -- Core impact data
    title VARCHAR(255) NOT NULL,
    description TEXT,
    esg_category VARCHAR(20) NOT NULL CHECK (esg_category IN ('environmental', 'social', 'governance')),
    
    -- Impact metrics
    people_impacted NUMERIC(12,2) DEFAULT 0,
    hours_contributed NUMERIC(8,2) DEFAULT 0,
    usd_value NUMERIC(12,2) DEFAULT 0,
    impact_unit VARCHAR(100) DEFAULT 'people',
    
    -- Verification
    verification_level VARCHAR(20) DEFAULT 'tier_1' CHECK (verification_level IN ('tier_1', 'tier_2', 'tier_3', 'tier_4')),
    verification_multiplier NUMERIC(3,2) DEFAULT 1.0,
    evidence_link TEXT DEFAULT NULL,
    
    -- SCP (Sustainable Change Points)
    scp_earned NUMERIC(10,2) DEFAULT 0,
    
    -- Points (for regular users only)
    points_earned INTEGER DEFAULT 0,
    points_eligible BOOLEAN DEFAULT TRUE,
    
    -- Date tracking
    activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Sharing controls
    share_externally BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_impact_entries_user_id ON impact_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_impact_entries_user_role ON impact_entries(user_role);
CREATE INDEX IF NOT EXISTS idx_impact_entries_entry_type ON impact_entries(entry_type);
CREATE INDEX IF NOT EXISTS idx_impact_entries_event_id ON impact_entries(event_id);
CREATE INDEX IF NOT EXISTS idx_impact_entries_esg_category ON impact_entries(esg_category);
CREATE INDEX IF NOT EXISTS idx_impact_entries_activity_date ON impact_entries(activity_date DESC);
CREATE INDEX IF NOT EXISTS idx_impact_entries_verification ON impact_entries(verification_level);
CREATE INDEX IF NOT EXISTS idx_impact_entries_created_at ON impact_entries(created_at DESC);

-- ============================================
-- 4. PLATFORM_IMPACT_AGGREGATES TABLE
-- Cached aggregated impact metrics for the admin dashboard / public tracker
-- Updated periodically or on event closure
-- ============================================
CREATE TABLE IF NOT EXISTS platform_impact_aggregates (
    aggregate_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_key VARCHAR(100) NOT NULL UNIQUE,
    metric_value NUMERIC(14,2) DEFAULT 0,
    last_calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default aggregate metrics
INSERT INTO platform_impact_aggregates (metric_key, metric_value) VALUES
('total_people_impacted', 0),
('total_hours_contributed', 0),
('total_usd_value', 0),
('total_scp', 0),
('total_impact_entries', 0),
('total_shared_events', 0),
('environmental_people_impacted', 0),
('social_people_impacted', 0),
('governance_people_impacted', 0),
('tier_1_entries', 0),
('tier_2_entries', 0),
('tier_3_entries', 0),
('tier_4_entries', 0),
('ambassador_people_impacted', 0),
('partner_people_impacted', 0),
('user_people_impacted', 0)
ON CONFLICT (metric_key) DO NOTHING;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'impact%' OR table_name LIKE 'event%' OR table_name LIKE 'platform%';
