-- ============================================
-- Add data_sharing_consent flag to ambassadors
-- ============================================

ALTER TABLE ambassadors
  ADD COLUMN IF NOT EXISTS data_sharing_consent BOOLEAN DEFAULT FALSE;

