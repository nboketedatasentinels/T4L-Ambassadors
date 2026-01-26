-- Remove default value from location column
-- This ensures that location must be explicitly provided when creating posts
-- Applicants need to know where the opportunity is located

-- Step 1: Verify current state
SELECT 
  column_name,
  is_nullable,
  column_default,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'posts'
  AND column_name = 'location';

-- Step 2: Check if there are any posts with 'TBD' as location that should be updated
SELECT 
  post_id,
  title,
  location,
  created_at
FROM posts 
WHERE location = 'TBD'
ORDER BY created_at DESC;

-- Step 3: Review the results above
-- If you have posts with 'TBD', update them with actual locations:
-- UPDATE posts SET location = 'Actual Location' WHERE post_id = 'some-uuid' AND location = 'TBD';

-- Step 4: Remove the default value from location column
-- This will require location to be explicitly provided in INSERT statements
ALTER TABLE posts 
  ALTER COLUMN location DROP DEFAULT;

-- Step 5: Verify the change
SELECT 
  column_name,
  is_nullable,
  column_default,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'posts'
  AND column_name = 'location';

-- Expected result: column_default should be NULL (no default)
-- is_nullable should still be NO (NOT NULL constraint remains)

-- Step 6: Update the comment to reflect the requirement
COMMENT ON COLUMN posts.location IS 'Required: Location of the opportunity (must be explicitly provided, e.g., "Remote", "New York, NY", "London, UK")';
