-- Add capacity column to services table (optional limit on number of applications/participants)
-- Run this in Supabase SQL Editor if the column does not exist.

ALTER TABLE services
ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT NULL;

COMMENT ON COLUMN services.capacity IS 'Max number of participants/applications; NULL means unlimited.';
