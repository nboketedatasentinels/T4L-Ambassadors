-- Make location and deadline NOT NULL in posts table
-- This migration ensures all posts have a location and deadline

-- Step 1: Check for existing NULL values
DO $$
DECLARE
  null_location_count INTEGER;
  null_deadline_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_location_count FROM posts WHERE location IS NULL;
  SELECT COUNT(*) INTO null_deadline_count FROM posts WHERE deadline IS NULL;
  
  RAISE NOTICE 'Found % posts with NULL location', null_location_count;
  RAISE NOTICE 'Found % posts with NULL deadline', null_deadline_count;
END $$;

-- Step 2: Update existing NULL location values with a default
-- Set to 'TBD' (To Be Determined) for existing records
UPDATE posts 
SET location = 'TBD' 
WHERE location IS NULL;

-- Step 3: Update existing NULL deadline values with a default
-- Set to 30 days from now for existing records without a deadline
UPDATE posts 
SET deadline = (CURRENT_DATE + INTERVAL '30 days')
WHERE deadline IS NULL;

-- Step 4: Alter location column to NOT NULL
ALTER TABLE posts 
  ALTER COLUMN location SET NOT NULL,
  ALTER COLUMN location SET DEFAULT 'TBD';

-- Step 5: Alter deadline column to NOT NULL
ALTER TABLE posts 
  ALTER COLUMN deadline SET NOT NULL;

-- Step 6: Verify the changes
DO $$
DECLARE
  location_null_count INTEGER;
  deadline_null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO location_null_count FROM posts WHERE location IS NULL;
  SELECT COUNT(*) INTO deadline_null_count FROM posts WHERE deadline IS NULL;
  
  IF location_null_count = 0 AND deadline_null_count = 0 THEN
    RAISE NOTICE 'SUCCESS: All posts now have location and deadline set';
  ELSE
    RAISE EXCEPTION 'FAILED: Still found NULL values - location: %, deadline: %', 
      location_null_count, deadline_null_count;
  END IF;
END $$;

-- Step 7: Add comments to document the requirement
COMMENT ON COLUMN posts.location IS 'Required: Location of the opportunity (e.g., "Remote", "New York, NY", "TBD")';
COMMENT ON COLUMN posts.deadline IS 'Required: Application deadline date for this opportunity';
