-- Migration: Add scanner detail columns to event_participants
-- Run this in your Supabase SQL editor

ALTER TABLE event_participants
  ADD COLUMN IF NOT EXISTS scanner_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS scanner_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS scanner_phone VARCHAR(100),
  ADD COLUMN IF NOT EXISTS scanner_company VARCHAR(255),
  ADD COLUMN IF NOT EXISTS scanner_role VARCHAR(100),
  ADD COLUMN IF NOT EXISTS source_platform VARCHAR(50) DEFAULT 't4l_ambassadors',
  ADD COLUMN IF NOT EXISTS source_user_id VARCHAR(255);

-- Index for dedup checks from cross-platform users
CREATE INDEX IF NOT EXISTS idx_event_participants_source
  ON event_participants(event_id, source_user_id, source_platform)
  WHERE source_user_id IS NOT NULL;
