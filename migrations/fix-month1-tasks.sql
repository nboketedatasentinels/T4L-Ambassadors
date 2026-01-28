-- ============================================
-- Fix Missing Month 1 Tasks
-- ============================================
-- This script adds the missing tasks for Month 1
-- Schema: task_id, task_identifier, month_id, task_name, task_description, 
--         is_critical, estimated_time, created_at, updated_at
-- ============================================

-- Step 1: Check what tasks currently exist in Month 1
SELECT 
  task_id, 
  task_identifier, 
  task_name, 
  is_critical,
  estimated_time
FROM journey_tasks 
WHERE month_id = (SELECT month_id FROM journey_months WHERE month_number = 1)
ORDER BY task_identifier;

-- Step 2: Check which specific tasks are missing
SELECT 
  'linkedin_course' as task_id,
  EXISTS(SELECT 1 FROM journey_tasks jt 
         JOIN journey_months jm ON jt.month_id = jm.month_id 
         WHERE jt.task_identifier = 'linkedin_course' AND jm.month_number = 1) as exists
UNION ALL
SELECT 
  'submit_profile',
  EXISTS(SELECT 1 FROM journey_tasks jt 
         JOIN journey_months jm ON jt.month_id = jm.month_id 
         WHERE jt.task_identifier = 'submit_profile' AND jm.month_number = 1)
UNION ALL
SELECT 
  'second_course',
  EXISTS(SELECT 1 FROM journey_tasks jt 
         JOIN journey_months jm ON jt.month_id = jm.month_id 
         WHERE jt.task_identifier = 'second_course' AND jm.month_number = 1)
UNION ALL
SELECT 
  'connect_10',
  EXISTS(SELECT 1 FROM journey_tasks jt 
         JOIN journey_months jm ON jt.month_id = jm.month_id 
         WHERE jt.task_identifier = 'connect_10' AND jm.month_number = 1)
UNION ALL
SELECT 
  'post_3x',
  EXISTS(SELECT 1 FROM journey_tasks jt 
         JOIN journey_months jm ON jt.month_id = jm.month_id 
         WHERE jt.task_identifier = 'post_3x' AND jm.month_number = 1);

-- Step 3: Add missing tasks for Month 1
-- Note: Uses ON CONFLICT to prevent duplicates if run multiple times

-- Add second_course (if missing)
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

-- Add connect_10 (if missing)
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

-- Add post_3x (if missing)
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

-- Step 4: Verify all 5 tasks now exist
SELECT 
  jm.month_number,
  jt.task_identifier,
  jt.task_name,
  jt.is_critical,
  jt.estimated_time,
  CASE 
    WHEN jt.task_id IS NOT NULL THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM journey_months jm
LEFT JOIN journey_tasks jt ON jt.month_id = jm.month_id 
  AND jt.task_identifier IN ('linkedin_course', 'submit_profile', 'second_course', 'connect_10', 'post_3x')
WHERE jm.month_number = 1
ORDER BY 
  CASE jt.task_identifier
    WHEN 'linkedin_course' THEN 1
    WHEN 'submit_profile' THEN 2
    WHEN 'second_course' THEN 3
    WHEN 'connect_10' THEN 4
    WHEN 'post_3x' THEN 5
    ELSE 6
  END;

-- Step 5: Final count check
SELECT 
  COUNT(*) as total_tasks,
  COUNT(*) FILTER (WHERE task_identifier = 'linkedin_course') as has_linkedin_course,
  COUNT(*) FILTER (WHERE task_identifier = 'submit_profile') as has_submit_profile,
  COUNT(*) FILTER (WHERE task_identifier = 'second_course') as has_second_course,
  COUNT(*) FILTER (WHERE task_identifier = 'connect_10') as has_connect_10,
  COUNT(*) FILTER (WHERE task_identifier = 'post_3x') as has_post_3x
FROM journey_tasks 
WHERE month_id = (SELECT month_id FROM journey_months WHERE month_number = 1);

-- Expected result: total_tasks = 5, all has_* columns = 1
