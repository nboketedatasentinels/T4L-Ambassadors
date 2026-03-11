-- Migration: Cross-platform identity (Firebase UID + phone number)
--
-- firebase_uid links Supabase users to Firebase Auth so both the
-- T4L-Ambassadors platform and the Tier platform share the same UID.
-- phone_number is a unique secondary identifier for cross-platform lookup.
-- Together, email + phone_number + firebase_uid guarantee that a user
-- is the same person on both platforms, and their impact logs are consistent.

-- 1. Add firebase_uid to the central users table (bridges Supabase ↔ Firebase)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS firebase_uid VARCHAR(128) UNIQUE;

CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid);

-- 2. Add phone_number to the central users table (unique cross-platform identifier)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20) UNIQUE;

CREATE INDEX IF NOT EXISTS idx_users_phone_number ON users(phone_number);

-- 3. Add phone_number to the ambassadors role table (for role-specific queries)
ALTER TABLE ambassadors
ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20);

-- 4. Backfill: copy existing phone_number from partners into users table
UPDATE users u
SET phone_number = p.phone_number
FROM partners p
WHERE p.user_id = u.user_id
  AND p.phone_number IS NOT NULL
  AND p.phone_number != ''
  AND u.phone_number IS NULL;

-- 5. Backfill: copy existing phone_number from ambassadors into users table
UPDATE users u
SET phone_number = a.phone_number
FROM ambassadors a
WHERE a.user_id = u.user_id
  AND a.phone_number IS NOT NULL
  AND a.phone_number != ''
  AND u.phone_number IS NULL;

-- 6. Add sync tracking columns to impact_entries (for cross-platform deduplication)
ALTER TABLE impact_entries
ADD COLUMN IF NOT EXISTS source_platform VARCHAR(50) DEFAULT NULL;

ALTER TABLE impact_entries
ADD COLUMN IF NOT EXISTS source_entry_id VARCHAR(255) DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_impact_entries_source
ON impact_entries(source_platform, source_entry_id);
