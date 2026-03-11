-- ============================================
-- Impact Log v3 - Data Model Alignment
-- ============================================
-- This migration extends the existing impact_entries and
-- rate_configuration tables so they can support:
-- - ESG vs Business Outcomes (impact_type)
-- - Benchmark-based USD social value
-- - User-entered USD business value
-- - Verification metadata
-- - ESG taxonomy with SASB topics and rate sources
--
-- It is additive and safe to run on existing data.

-- 1) Extend rate_configuration with benchmark metadata

ALTER TABLE rate_configuration
  ADD COLUMN IF NOT EXISTS impact_unit VARCHAR(100),
  ADD COLUMN IF NOT EXISTS unit_rate_usd NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS rate_source TEXT,
  ADD COLUMN IF NOT EXISTS volunteer_hour_rate NUMERIC(12,2) DEFAULT 33.49,
  ADD COLUMN IF NOT EXISTS effective_date DATE,
  ADD COLUMN IF NOT EXISTS sasb_topic VARCHAR(255);

-- 2) Extend impact_entries with complete impact model fields

ALTER TABLE impact_entries
  ADD COLUMN IF NOT EXISTS impact_type VARCHAR(30),                  -- 'esg' | 'business_outcome'
  ADD COLUMN IF NOT EXISTS usd_value NUMERIC(12,2) DEFAULT 0,        -- Final USD value (ESG or Business)
  ADD COLUMN IF NOT EXISTS usd_value_source VARCHAR(20),             -- 'auto' | 'user_entered'
  ADD COLUMN IF NOT EXISTS unit_rate_applied NUMERIC(12,2),          -- ESG benchmark rate at creation
  ADD COLUMN IF NOT EXISTS vol_hour_rate_applied NUMERIC(12,2),      -- Volunteer hour rate at creation

  ADD COLUMN IF NOT EXISTS waste_primary VARCHAR(10),                -- DEF|OVR|WAI|NUT|TRA|INV|MOT|EXP
  ADD COLUMN IF NOT EXISTS waste_secondary VARCHAR(10),
  ADD COLUMN IF NOT EXISTS improvement_method VARCHAR(50),
  ADD COLUMN IF NOT EXISTS outcome_statement VARCHAR(150),

  ADD COLUMN IF NOT EXISTS verifier_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS verifier_role VARCHAR(255),
  ADD COLUMN IF NOT EXISTS verifier_comment TEXT,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,

  ADD COLUMN IF NOT EXISTS sasb_topic VARCHAR(255),
  ADD COLUMN IF NOT EXISTS source_platform VARCHAR(50),              -- 't4l' | 'transformation_tier'
  ADD COLUMN IF NOT EXISTS creator_role VARCHAR(50),                 -- 'partner' | 'ambassador' | 'learner'
  ADD COLUMN IF NOT EXISTS upload_batch_id UUID;

