-- ============================================
-- Add optional LinkedIn / Speaker profile URLs
-- to ambassadors (About Me profile fields)
-- ============================================

ALTER TABLE ambassadors
  ADD COLUMN IF NOT EXISTS linkedin_profile_url TEXT,
  ADD COLUMN IF NOT EXISTS speaker_profile_url TEXT;

