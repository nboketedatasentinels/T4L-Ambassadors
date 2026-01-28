-- ============================================
-- Diagnostic Script: Find Missing Tasks
-- ============================================
-- This script helps identify which tasks are missing
-- from the database compared to what the frontend expects
-- ============================================

-- Step 1: List all tasks that SHOULD exist (from frontend)
-- Month 1 tasks
WITH expected_tasks AS (
  SELECT 'linkedin_course' as task_id, 1 as month_num, 'Complete LinkedIn Warrior Course' as task_name UNION ALL
  SELECT 'submit_profile', 1, 'Submit LinkedIn profile for audit' UNION ALL
  SELECT 'second_course', 1, 'Complete Transformational Leadership Course' UNION ALL
  SELECT 'connect_10', 1, 'Connect with 10 new people in your industry' UNION ALL
  SELECT 'post_3x', 1, 'Announce your T4L Ambassador enrollment on LinkedIn' UNION ALL
  -- Month 2
  SELECT 'implement_audit', 2, 'Implement profile audit recommendations' UNION ALL
  SELECT 'third_course', 2, 'Complete Science of You: Personality & Strengths' UNION ALL
  SELECT 'submit_article_1', 2, 'Submit your first article idea' UNION ALL
  SELECT 'engage_15', 2, 'Engage with 15 posts across T4L community channels' UNION ALL
  -- Month 3
  SELECT 'first_event', 3, 'Attend your first quarterly networking event' UNION ALL
  SELECT 'transformation_post', 3, 'Post transformation update on LinkedIn (90 days)' UNION ALL
  SELECT 'submit_article_2', 3, 'Submit second article (if first is published)' UNION ALL
  SELECT 'update_impact_log', 3, 'Update your impact log' UNION ALL
  -- Month 4
  SELECT 'volunteer', 4, 'Volunteer for a leadership opportunity' UNION ALL
  SELECT 'complete_courses', 4, 'AI Stacking 101' UNION ALL
  SELECT 'request_recommendation', 4, 'Request letter of recommendation (if needed)' UNION ALL
  SELECT 'post_4x', 4, 'Post 4x on LinkedIn this month' UNION ALL
  -- Month 5
  SELECT 'lead_something', 5, 'Lead or co-lead (book club, session, event)' UNION ALL
  SELECT 'check_article', 5, 'Check article status and take action' UNION ALL
  SELECT 'daily_engage', 5, 'Engage with Ambassadors content daily (5 min/day)' UNION ALL
  SELECT 'update_impact_5', 5, 'Update impact log' UNION ALL
  -- Month 6
  SELECT 'quarterly_event_2', 6, 'Attend your second quarterly networking event' UNION ALL
  SELECT 'schedule_podcast', 6, 'Schedule your podcast episode' UNION ALL
  SELECT 'halfway_story', 6, 'Post your halfway transformation story' UNION ALL
  -- Month 7
  SELECT 'submit_article_next', 7, 'Submit next article (if you haven''t already)' UNION ALL
  SELECT 'lead_second', 7, 'Host or lead an opportunity (if you haven''t completed the form already)' UNION ALL
  SELECT 'post_4x_m7', 7, 'Post consistently: 4x this month' UNION ALL
  -- Month 8
  SELECT 'check_partners', 8, 'Check T4L Partners portal weekly' UNION ALL
  SELECT 'update_speaker', 8, 'Update Speaker Materials' UNION ALL
  SELECT 'speaking_pitch', 8, 'Submit speaking pitch (outside T4L)' UNION ALL
  SELECT 'update_impact_8', 8, 'Update impact log' UNION ALL
  -- Month 9
  SELECT 'quarterly_event_3', 9, 'Attend your Third quarterly networking event' UNION ALL
  SELECT 'follow_up_5', 9, 'Follow up with 5 people from event' UNION ALL
  -- Month 10
  SELECT 'submit_final', 10, 'Submit final articles' UNION ALL
  SELECT 'update_impact_10', 10, 'Update impact log' UNION ALL
  SELECT 'apply_speaking', 10, 'Apply for 2+ speaking opportunities' UNION ALL
  -- Month 11
  SELECT 'quarterly_event_4', 11, 'Attend your Final quarterly networking event' UNION ALL
  SELECT 'final_impact', 11, 'Complete final impact log' UNION ALL
  SELECT 'transformation_story', 11, 'Post full year transformation story' UNION ALL
  -- Month 12
  SELECT 'decide_renewal', 12, 'Decide on renewal (Top Voices, free tier, or alumni)' UNION ALL
  SELECT 'schedule_call', 12, 'Schedule renewal call with T4L'
)
-- Step 2: Compare with what actually exists
SELECT 
  et.month_num,
  et.task_id,
  et.task_name,
  CASE 
    WHEN jt.task_id IS NOT NULL THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status,
  jt.task_id as db_task_id
FROM expected_tasks et
LEFT JOIN journey_months jm ON et.month_num = jm.month_number
LEFT JOIN journey_tasks jt ON jt.task_identifier = et.task_id AND jt.month_id = jm.month_id
ORDER BY et.month_num, et.task_id;

-- Step 3: Show only missing tasks
SELECT 
  et.month_num,
  jm.month_name,
  et.task_id,
  et.task_name
FROM expected_tasks et
LEFT JOIN journey_months jm ON et.month_num = jm.month_number
LEFT JOIN journey_tasks jt ON jt.task_identifier = et.task_id AND jt.month_id = jm.month_id
WHERE jt.task_id IS NULL
ORDER BY et.month_num, et.task_id;
