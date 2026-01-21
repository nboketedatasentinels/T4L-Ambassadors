-- ============================================
-- ADD SUBSCRIPTION FIELD TO AMBASSADORS TABLE
-- Run this migration in your Supabase SQL Editor
-- ============================================

-- Add subscription_type column to ambassadors table
ALTER TABLE ambassadors 
ADD COLUMN IF NOT EXISTS subscription_type VARCHAR(20) DEFAULT 'free' CHECK (subscription_type IN ('free', 'paid'));

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_ambassadors_subscription_type ON ambassadors(subscription_type);

-- Update existing ambassadors to 'free' if NULL
UPDATE ambassadors 
SET subscription_type = 'free' 
WHERE subscription_type IS NULL;

-- Add comment to document the column (PostgreSQL specific)
COMMENT ON COLUMN ambassadors.subscription_type IS 'Ambassador subscription level: free or paid';

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- View all subscription types
-- SELECT 
--   a.first_name,
--   a.last_name,
--   u.email,
--   a.subscription_type,
--   a.created_at
-- FROM ambassadors a
-- JOIN users u ON a.user_id = u.user_id
-- ORDER BY a.created_at DESC;

-- Count by subscription type
-- SELECT 
--   subscription_type,
--   COUNT(*) as count
-- FROM ambassadors
-- GROUP BY subscription_type;
