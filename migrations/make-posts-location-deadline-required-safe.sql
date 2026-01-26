-- SAFE VERSION: Make location and deadline NOT NULL in posts table
-- This version requires manual review of existing NULL values before applying constraints

-- Step 1: Check for existing NULL values (run this first to see what needs to be fixed)
SELECT 
  post_id,
  title,
  location,
  deadline,
  created_at
FROM posts 
WHERE location IS NULL OR deadline IS NULL
ORDER BY created_at DESC;

-- Step 2: Review the results above and manually update NULL values
-- Example updates (customize based on your data):
-- UPDATE posts SET location = 'Remote' WHERE post_id = 'some-uuid' AND location IS NULL;
-- UPDATE posts SET deadline = '2025-12-31' WHERE post_id = 'some-uuid' AND deadline IS NULL;

-- Step 3: After all NULL values are handled, run the following to add NOT NULL constraints

-- Verify no NULL values remain
DO $$
DECLARE
  null_location_count INTEGER;
  null_deadline_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_location_count FROM posts WHERE location IS NULL;
  SELECT COUNT(*) INTO null_deadline_count FROM posts WHERE deadline IS NULL;
  
  IF null_location_count > 0 OR null_deadline_count > 0 THEN
    RAISE EXCEPTION 'Cannot proceed: Found NULL values - location: %, deadline: %. Please update these records first.', 
      null_location_count, null_deadline_count;
  END IF;
  
  RAISE NOTICE 'All records have location and deadline set. Proceeding with constraint addition...';
END $$;

-- Step 4: Add NOT NULL constraints
ALTER TABLE posts 
  ALTER COLUMN location SET NOT NULL;

ALTER TABLE posts 
  ALTER COLUMN deadline SET NOT NULL;

-- Step 5: Add default for location (optional - helps with future inserts)
ALTER TABLE posts 
  ALTER COLUMN location SET DEFAULT 'TBD';

-- Step 6: Verify constraints are in place
SELECT 
  column_name,
  is_nullable,
  column_default,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'posts'
  AND column_name IN ('location', 'deadline')
ORDER BY column_name;

-- Step 7: Add comments to document the requirement
COMMENT ON COLUMN posts.location IS 'Required: Location of the opportunity (e.g., "Remote", "New York, NY", "TBD")';
COMMENT ON COLUMN posts.deadline IS 'Required: Application deadline date for this opportunity';
