-- ============================================
-- Partner Impact Log - Rate Configuration & Upload Batches
-- ============================================
-- This migration adds generic tables that are used by the
-- Partner Impact Log feature for ESG rate configuration and
-- (future) bulk upload tracking. It does NOT change existing
-- impact_events / impact_entries behaviour.
--
-- Safe to run multiple times (uses IF NOT EXISTS / ON CONFLICT).

-- 1) RATE_CONFIGURATION
-- Stores reusable ESG activity rate settings used to derive
-- people_impacted, hours_contributed, usd_value, SCP and points
-- from a single "quantity" value in the UI.

CREATE TABLE IF NOT EXISTS rate_configuration (
    rate_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Logical key
    activity_key VARCHAR(100) NOT NULL,

    -- Core classification
    esg_category VARCHAR(20) NOT NULL CHECK (esg_category IN ('environmental', 'social', 'governance')),
    activity_label VARCHAR(255) NOT NULL,
    description TEXT,

    -- How the UI should treat the quantity
    unit_label VARCHAR(100) DEFAULT 'units',         -- e.g. "hours", "attendees", "trees"
    unit_placeholder VARCHAR(255),                   -- e.g. "Number of employees volunteering"

    -- Conversion from 1 unit to impact metrics
    people_per_unit NUMERIC(12,2) DEFAULT 0,
    hours_per_unit NUMERIC(12,2) DEFAULT 0,
    usd_per_unit NUMERIC(12,2) DEFAULT 0,

    -- SCP & gamification
    scp_per_unit NUMERIC(10,2) DEFAULT 0,
    points_per_unit INTEGER DEFAULT 0,

    -- Verification defaults used when creating entries
    default_verification_level VARCHAR(20) DEFAULT 'tier_2'
      CHECK (default_verification_level IN ('tier_1', 'tier_2', 'tier_3')),
    default_verification_multiplier NUMERIC(3,2) DEFAULT 1.5,

    -- Misc flags
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_rate_configuration_activity_key
  ON rate_configuration(activity_key);

CREATE INDEX IF NOT EXISTS idx_rate_configuration_esg_category
  ON rate_configuration(esg_category);

-- Seed a small, opinionated default set for ESG.
-- These can be edited later via SQL or an admin UI.

INSERT INTO rate_configuration (
  activity_key, esg_category, activity_label, description,
  unit_label, unit_placeholder,
  people_per_unit, hours_per_unit, usd_per_unit,
  scp_per_unit, points_per_unit,
  default_verification_level, default_verification_multiplier,
  is_active, sort_order
) VALUES
  -- Social examples
  (
    'social_employee_volunteering',
    'social',
    'Employee volunteering',
    'Track hours your employees volunteer in community projects.',
    'hours',
    'Total volunteering hours',
    0,              -- derived people impacted is often tracked separately
    1,              -- 1 unit = 1 volunteering hour
    0,
    1,              -- 1 SCP per volunteering hour (example only)
    10,             -- 10 gamification points per hour
    'tier_2',
    1.5,
    TRUE,
    10
  ),
  (
    'social_beneficiaries_reached',
    'social',
    'Beneficiaries reached',
    'Record how many people directly benefited from your initiative.',
    'people',
    'Number of beneficiaries',
    1,              -- 1 unit = 1 person impacted
    0,
    0,
    0.5,            -- 0.5 SCP per person (example only)
    5,              -- 5 points per person
    'tier_2',
    1.2,
    TRUE,
    20
  ),

  -- Environmental example
  (
    'environmental_trees_planted',
    'environmental',
    'Trees planted',
    'Count trees planted or restored as part of environmental projects.',
    'trees',
    'Number of trees planted',
    0,              -- people_impacted is indirect here
    0,
    0,
    2,              -- 2 SCP per tree (example only)
    0,
    'tier_2',
    1.5,
    TRUE,
    30
  ),

  -- Governance example
  (
    'governance_training_sessions',
    'governance',
    'Governance / compliance trainings',
    'Record number of people trained on governance, ethics or compliance topics.',
    'attendees',
    'Number of employees trained',
    1,
    0,
    0,
    0.75,
    5,
    'tier_2',
    1.5,
    TRUE,
    40
  )
ON CONFLICT (activity_key) DO NOTHING;


-- 2) UPLOAD_BATCHES
-- Tracks CSV / bulk uploads for the impact log (future use).

CREATE TABLE IF NOT EXISTS upload_batches (
    batch_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Who triggered the upload
    uploaded_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    uploaded_by_role VARCHAR(20) DEFAULT 'partner'
      CHECK (uploaded_by_role IN ('ambassador', 'partner', 'admin')),

    -- Optional linkage to a specific partner org
    partner_id UUID REFERENCES partners(partner_id) ON DELETE SET NULL,

    -- File + process metadata
    original_filename VARCHAR(255),
    source VARCHAR(50) DEFAULT 'partner_portal', -- e.g. 'partner_portal', 'admin_console'

    status VARCHAR(20) DEFAULT 'pending'
      CHECK (status IN ('pending', 'processing', 'completed', 'failed')),

    total_rows INTEGER DEFAULT 0,
    success_rows INTEGER DEFAULT 0,
    error_rows INTEGER DEFAULT 0,

    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_upload_batches_uploaded_by
  ON upload_batches(uploaded_by);

CREATE INDEX IF NOT EXISTS idx_upload_batches_partner_id
  ON upload_batches(partner_id);

CREATE INDEX IF NOT EXISTS idx_upload_batches_status
  ON upload_batches(status);

