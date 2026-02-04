-- ============================================
-- ADD LINKEDIN_AUDITS COLUMNS (feedback, URLs, submitted_at)
-- Run this migration if your linkedin_audits table was created from an older schema.
-- ============================================

-- Columns used by the app when saving/loading LinkedIn audit data
ALTER TABLE linkedin_audits
  ADD COLUMN IF NOT EXISTS feedback TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
  ADD COLUMN IF NOT EXISTS speaker_bio_url TEXT,
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Allow status values: pending, submitted, reviewed, completed, approved, in_progress, cancelled
-- Drop existing status check (name may vary by provider)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'linkedin_audits' AND c.contype = 'c'
  LOOP
    EXECUTE format('ALTER TABLE linkedin_audits DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END $$;
ALTER TABLE linkedin_audits
  ADD CONSTRAINT linkedin_audits_status_check
  CHECK (status IN ('pending', 'submitted', 'reviewed', 'completed', 'approved', 'in_progress', 'cancelled'));
