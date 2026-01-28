-- ============================================
-- Verification and Fix Script for Journey Tasks
-- ============================================
-- This script:
-- 1. Shows which tasks currently exist
-- 2. Adds any missing tasks from the frontend
-- 3. Handles conflicts gracefully
-- ============================================

-- Step 1: Check what tasks currently exist
SELECT 
  jm.month_number,
  jm.month_name,
  jt.task_identifier,
  jt.task_name,
  jt.is_critical
FROM journey_tasks jt
JOIN journey_months jm ON jt.month_id = jm.month_id
ORDER BY jm.month_number, jt.task_identifier;

-- Step 2: Add missing tasks (with conflict handling)
-- This will only insert tasks that don't already exist

-- MONTH 1: Foundation Building
INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, estimated_time, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  'linkedin_course',
  month_id,
  'Complete LinkedIn Warrior Course',
  'Complete the LinkedIn Warrior course to build your foundation',
  true,
  '2 hours',
  NOW(),
  NOW()
FROM journey_months WHERE month_number = 1
ON CONFLICT (task_identifier, month_id) DO NOTHING;

INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, estimated_time, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  'submit_profile',
  month_id,
  'Submit LinkedIn profile for audit',
  'Submit your LinkedIn profile and speaker materials for audit',
  true,
  '30 mins',
  NOW(),
  NOW()
FROM journey_months WHERE month_number = 1
ON CONFLICT (task_identifier, month_id) DO NOTHING;

INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, estimated_time, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  'second_course',
  month_id,
  'Complete Transformational Leadership Course',
  'Complete Transformational Leadership Course',
  true,
  '3 hours',
  NOW(),
  NOW()
FROM journey_months WHERE month_number = 1
ON CONFLICT (task_identifier, month_id) DO NOTHING;

INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, estimated_time, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  'connect_10',
  month_id,
  'Connect with 10 new people in your industry',
  'Connect with 10 Ambassadors on LinkedIn',
  false,
  '1 hour',
  NOW(),
  NOW()
FROM journey_months WHERE month_number = 1
ON CONFLICT (task_identifier, month_id) DO NOTHING;

INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, estimated_time, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  'post_3x',
  month_id,
  'Announce your T4L Ambassador enrollment on LinkedIn',
  'Post on LinkedIn 3x this month',
  false,
  '2 hours',
  NOW(),
  NOW()
FROM journey_months WHERE month_number = 1
ON CONFLICT (task_identifier, month_id) DO NOTHING;

-- Step 3: Verify the fix
SELECT 
  'Month 1 Tasks' as check_type,
  COUNT(*) as task_count,
  STRING_AGG(task_identifier, ', ' ORDER BY task_identifier) as task_identifiers
FROM journey_tasks jt
JOIN journey_months jm ON jt.month_id = jm.month_id
WHERE jm.month_number = 1;

-- Step 4: Check for the specific missing task
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM journey_tasks jt
      JOIN journey_months jm ON jt.month_id = jm.month_id
      WHERE jt.task_identifier = 'second_course' AND jm.month_number = 1
    ) THEN '✅ second_course EXISTS'
    ELSE '❌ second_course MISSING'
  END as status;
