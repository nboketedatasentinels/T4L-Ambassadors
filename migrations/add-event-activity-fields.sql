-- Add ESG taxonomy activity type and estimated hours per participant to shared impact events.
-- Used by Create Event form (Section 9.1): Activity Type from taxonomy, hours per participant for QR-based events.

ALTER TABLE impact_events
  ADD COLUMN IF NOT EXISTS activity_key VARCHAR(100) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS estimated_hours_per_participant NUMERIC(8,2) DEFAULT NULL;

COMMENT ON COLUMN impact_events.activity_key IS 'ESG taxonomy activity key (from rate_configuration) for this event';
COMMENT ON COLUMN impact_events.estimated_hours_per_participant IS 'Hours credited per participant when they scan/log participation';

-- Optional: location and registration deadline for Create Event form
ALTER TABLE impact_events
  ADD COLUMN IF NOT EXISTS location TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS registration_deadline DATE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS registration_link TEXT DEFAULT NULL;
