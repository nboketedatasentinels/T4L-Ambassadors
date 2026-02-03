-- ============================================
-- ADD LINKEDIN AUDIT REMINDER SENT FLAG
-- Run this migration in your Supabase SQL Editor
-- ============================================
-- Tracks that the "upload LinkedIn profile audit" admin reminder
-- has been sent once, after the ambassador's first week in the program.

ALTER TABLE ambassadors
ADD COLUMN IF NOT EXISTS linkedin_audit_reminder_sent_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

COMMENT ON COLUMN ambassadors.linkedin_audit_reminder_sent_at IS 'When the one-time admin reminder to upload LinkedIn profile audit was sent (after first week).';
