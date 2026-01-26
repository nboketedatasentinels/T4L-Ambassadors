-- Fix notifications_reference_check constraint to allow notifications without references
-- This allows notification types like 'journey_completed' that don't need application_id, request_id, or article_id

-- Drop the existing constraint
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_reference_check;

-- Recreate the constraint to allow:
-- 1. Exactly one reference field is non-null (original behavior)
-- 2. OR all reference fields are null (for notification types that don't need references)
ALTER TABLE notifications ADD CONSTRAINT notifications_reference_check CHECK (
  (
    (application_id IS NOT NULL)::int + 
    (request_id IS NOT NULL)::int + 
    (article_id IS NOT NULL)::int + 
    (COALESCE(certificate_id, NULL) IS NOT NULL)::int = 1
  ) OR (
    application_id IS NULL AND 
    request_id IS NULL AND 
    article_id IS NULL AND 
    certificate_id IS NULL
  )
);

-- Verify the constraint
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'notifications'::regclass
  AND conname = 'notifications_reference_check';
