-- ============================================
-- IMPACT LOG FEATURE - Database Migration
-- Creates: impact_events, event_participants, impact_entries
-- ============================================

-- Enable UUID extension (should already exist)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. IMPACT_ENTRIES TABLE (Individual impact logs)
-- ============================================
CREATE TABLE IF NOT EXISTS impact_entries (
    entry_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    user_role VARCHAR(20) NOT NULL CHECK (user_role IN ('ambassador', 'partner', 'user')),
    
    -- Entry type
    entry_type VARCHAR(20) NOT NULL DEFAULT 'individual' CHECK (entry_type IN ('individual', 'event_master', 'event_derived')),
    event_id UUID, -- References impact_events if entry_type is event_master or event_derived
    
    -- Core fields
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- ESG categorization
    esg_category VARCHAR(20) NOT NULL CHECK (esg_category IN ('environmental', 'social', 'governance')),
    
    -- Impact metrics
    people_impacted INTEGER DEFAULT 0,
    hours_contributed NUMERIC(10,2) DEFAULT 0,
    usd_value NUMERIC(12,2) DEFAULT 0,
    impact_unit VARCHAR(50) DEFAULT 'people',
    
    -- SCP (Social Capital Points)
    scp_earned NUMERIC(10,2) DEFAULT 0,
    
    -- Points (for regular users only, 1 per month)
    points_earned INTEGER DEFAULT 0,
    points_month VARCHAR(7), -- e.g., '2026-02' for monthly tracking
    
    -- Verification
    verification_level VARCHAR(10) DEFAULT 'tier_1' CHECK (verification_level IN ('tier_1', 'tier_2', 'tier_3', 'tier_4')),
    verification_multiplier NUMERIC(3,1) DEFAULT 1.0,
    evidence_url TEXT,
    external_verifier_email VARCHAR(255),
    
    -- Date of the activity
    activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Sharing controls
    share_externally BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    is_past_dated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_impact_entries_user_id ON impact_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_impact_entries_user_role ON impact_entries(user_role);
CREATE INDEX IF NOT EXISTS idx_impact_entries_entry_type ON impact_entries(entry_type);
CREATE INDEX IF NOT EXISTS idx_impact_entries_event_id ON impact_entries(event_id);
CREATE INDEX IF NOT EXISTS idx_impact_entries_esg_category ON impact_entries(esg_category);
CREATE INDEX IF NOT EXISTS idx_impact_entries_verification_level ON impact_entries(verification_level);
CREATE INDEX IF NOT EXISTS idx_impact_entries_activity_date ON impact_entries(activity_date);
CREATE INDEX IF NOT EXISTS idx_impact_entries_created_at ON impact_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_impact_entries_points_month ON impact_entries(user_id, points_month);

-- ============================================
-- 2. IMPACT_EVENTS TABLE (Shared Impact Events)
-- ============================================
CREATE TABLE IF NOT EXISTS impact_events (
    event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_by UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    creator_role VARCHAR(20) NOT NULL CHECK (creator_role IN ('ambassador', 'partner', 'admin')),
    
    -- Event details
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- ESG categorization
    esg_category VARCHAR(20) NOT NULL CHECK (esg_category IN ('environmental', 'social', 'governance')),
    
    -- Impact
    total_impact_value INTEGER NOT NULL DEFAULT 0,
    impact_unit VARCHAR(50) NOT NULL DEFAULT 'people',
    
    -- Timing
    event_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    
    -- Status
    status VARCHAR(10) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    
    -- Verification (defaults to Tier 2)
    verification_level VARCHAR(10) DEFAULT 'tier_2',
    verification_multiplier NUMERIC(3,1) DEFAULT 1.5,
    
    -- Optional fields
    expected_participants INTEGER,
    evidence_url TEXT,
    external_verifier_email VARCHAR(255),
    
    -- Public link for sharing
    public_slug VARCHAR(20) NOT NULL UNIQUE,
    
    -- Computed after closure
    actual_participants INTEGER DEFAULT 0,
    per_participant_impact NUMERIC(12,2) DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_impact_events_created_by ON impact_events(created_by);
CREATE INDEX IF NOT EXISTS idx_impact_events_creator_role ON impact_events(creator_role);
CREATE INDEX IF NOT EXISTS idx_impact_events_status ON impact_events(status);
CREATE INDEX IF NOT EXISTS idx_impact_events_event_date ON impact_events(event_date);
CREATE INDEX IF NOT EXISTS idx_impact_events_esg_category ON impact_events(esg_category);
CREATE INDEX IF NOT EXISTS idx_impact_events_public_slug ON impact_events(public_slug);
CREATE INDEX IF NOT EXISTS idx_impact_events_created_at ON impact_events(created_at DESC);

-- ============================================
-- 3. EVENT_PARTICIPANTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS event_participants (
    participant_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES impact_events(event_id) ON DELETE CASCADE,
    
    -- Participant identification
    user_id UUID REFERENCES users(user_id) ON DELETE SET NULL, -- NULL for anonymous
    participant_type VARCHAR(10) NOT NULL DEFAULT 'user' CHECK (participant_type IN ('user', 'anonymous')),
    anonymous_hash VARCHAR(64), -- Device/session hash for anonymous participants
    
    -- Display info (for anonymous)
    display_name VARCHAR(100),
    
    -- Derived impact (calculated after event closure)
    impact_share NUMERIC(12,2) DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_event_participants_event_id ON event_participants(event_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_user_id ON event_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_anonymous_hash ON event_participants(anonymous_hash);

-- Unique constraint: one participation per user per event
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_participants_unique_user 
    ON event_participants(event_id, user_id) WHERE user_id IS NOT NULL;

-- Unique constraint: one participation per anonymous hash per event
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_participants_unique_anon 
    ON event_participants(event_id, anonymous_hash) WHERE anonymous_hash IS NOT NULL;

-- ============================================
-- 4. Add foreign key from impact_entries to impact_events
-- ============================================
ALTER TABLE impact_entries 
    ADD CONSTRAINT fk_impact_entries_event 
    FOREIGN KEY (event_id) REFERENCES impact_events(event_id) ON DELETE CASCADE;

-- ============================================
-- VERIFICATION
-- ============================================
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' AND table_name LIKE 'impact%' OR table_name = 'event_participants'
-- ORDER BY table_name;
