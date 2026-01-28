-- ============================================
-- Migration Script: Populate journey_tasks table
-- ============================================
-- This script populates the journey_tasks table with all tasks
-- from the frontend journey.html file.
--
-- IMPORTANT: Run this AFTER ensuring journey_months table is populated
-- with months 1-12.
-- ============================================

-- First, let's ensure we have the month_ids. You'll need to adjust these
-- based on your actual month_id UUIDs from journey_months table.
-- 
-- To get your month_ids, run:
-- SELECT month_id, month_number, month_name FROM journey_months ORDER BY month_number;

-- ============================================
-- MONTH 1: Foundation Building
-- ============================================
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
  'Choose and start second course (Transformational Leadership)',
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

-- ============================================
-- MONTH 2: Content Creation & Community Engagement
-- ============================================
INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, estimated_time, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  'implement_audit',
  month_id,
  'Implement profile audit recommendations',
  'Implement the recommendations from your profile audit',
  true,
  '1 hour',
  NOW(),
  NOW()
FROM journey_months WHERE month_number = 2
ON CONFLICT (task_identifier, month_id) DO NOTHING;

INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, estimated_time, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  'third_course',
  month_id,
  'Complete Science of You: Personality & Strengths',
  'Start third course: Science of You',
  true,
  '2 hours',
  NOW(),
  NOW()
FROM journey_months WHERE month_number = 2
ON CONFLICT (task_identifier, month_id) DO NOTHING;

INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, estimated_time, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  'submit_article_1',
  month_id,
  'Submit your first article idea',
  'Submit your first article (4-6 week review)',
  true,
  '45 mins',
  NOW(),
  NOW()
FROM journey_months WHERE month_number = 2
ON CONFLICT (task_identifier, month_id) DO NOTHING;

INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, estimated_time, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  'engage_15',
  month_id,
  'Engage with 15 posts across T4L community channels',
  'Engage with 15 ambassador posts this month',
  false,
  '1 hour',
  NOW(),
  NOW()
FROM journey_months WHERE month_number = 2
ON CONFLICT (task_identifier, month_id) DO NOTHING;

-- ============================================
-- MONTH 3: ENGAGE
-- ============================================
INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, estimated_time, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  'first_event',
  month_id,
  'Attend your first quarterly networking event',
  'Attend your first quarterly networking event',
  true,
  '2 hours',
  NOW(),
  NOW()
FROM journey_months WHERE month_number = 3
ON CONFLICT (task_identifier, month_id) DO NOTHING;

INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, estimated_time, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  'transformation_post',
  month_id,
  'Post transformation update on LinkedIn (90 days)',
  'Post transformation update on LinkedIn (90 days)',
  false,
  '2 hours',
  NOW(),
  NOW()
FROM journey_months WHERE month_number = 3
ON CONFLICT (task_identifier, month_id) DO NOTHING;

INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, estimated_time, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  'submit_article_2',
  month_id,
  'Submit second article (if first is published)',
  'Submit second article (if first is published)',
  false,
  '3 hours',
  NOW(),
  NOW()
FROM journey_months WHERE month_number = 3
ON CONFLICT (task_identifier, month_id) DO NOTHING;

INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, estimated_time, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  'update_impact_log',
  month_id,
  'Update your impact log',
  'Update your impact log',
  false,
  '30 mins',
  NOW(),
  NOW()
FROM journey_months WHERE month_number = 3
ON CONFLICT (task_identifier, month_id) DO NOTHING;

-- ============================================
-- MONTH 4: LEAD
-- ============================================
INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, estimated_time, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  'volunteer',
  month_id,
  'Volunteer for a leadership opportunity',
  'Volunteer for a leadership opportunity',
  true,
  '2 hours',
  NOW(),
  NOW()
FROM journey_months WHERE month_number = 4
ON CONFLICT (task_identifier, month_id) DO NOTHING;

INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, estimated_time, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  'complete_courses',
  month_id,
  'AI Stacking 101',
  'Complete all 4 core courses',
  true,
  '4 hours',
  NOW(),
  NOW()
FROM journey_months WHERE month_number = 4
ON CONFLICT (task_identifier, month_id) DO NOTHING;

INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, estimated_time, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  'request_recommendation',
  month_id,
  'Request letter of recommendation (if needed)',
  'Request letter of recommendation (if needed)',
  false,
  '1 hour',
  NOW(),
  NOW()
FROM journey_months WHERE month_number = 4
ON CONFLICT (task_identifier, month_id) DO NOTHING;

INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, estimated_time, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  'post_4x',
  month_id,
  'Post 4x on LinkedIn this month',
  'Post 4x on LinkedIn this month',
  false,
  '2 hours',
  NOW(),
  NOW()
FROM journey_months WHERE month_number = 4
ON CONFLICT (task_identifier, month_id) DO NOTHING;

-- ============================================
-- MONTH 5: AMPLIFY
-- ============================================
INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, estimated_time, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  'lead_something',
  month_id,
  'Lead or co-lead (book club, session, event)',
  'Lead or co-lead something (book club, session, event). If you haven''t completed the form yet, please do so here',
  true,
  '3 hours',
  NOW(),
  NOW()
FROM journey_months WHERE month_number = 5
ON CONFLICT (task_identifier, month_id) DO NOTHING;

INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, estimated_time, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  'check_article',
  month_id,
  'Check article status and take action',
  'Check article status and take action',
  true,
  '30 mins',
  NOW(),
  NOW()
FROM journey_months WHERE month_number = 5
ON CONFLICT (task_identifier, month_id) DO NOTHING;

INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, estimated_time, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  'daily_engage',
  month_id,
  'Engage with Ambassadors content daily (5 min/day)',
  'Engage with Ambassadors content daily (5 min/day)',
  false,
  '2 hours',
  NOW(),
  NOW()
FROM journey_months WHERE month_number = 5
ON CONFLICT (task_identifier, month_id) DO NOTHING;

INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, estimated_time, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  'update_impact_5',
  month_id,
  'Update impact log',
  'Update impact log',
  false,
  '45 mins',
  NOW(),
  NOW()
FROM journey_months WHERE month_number = 5
ON CONFLICT (task_identifier, month_id) DO NOTHING;

-- ============================================
-- MONTH 6: MIDPOINT
-- ============================================
INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, estimated_time, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  'quarterly_event_2',
  month_id,
  'Attend your second quarterly networking event',
  'Attend quarterly networking event',
  true,
  '2 hours',
  NOW(),
  NOW()
FROM journey_months WHERE month_number = 6
ON CONFLICT (task_identifier, month_id) DO NOTHING;

INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, estimated_time, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  'schedule_podcast',
  month_id,
  'Schedule your podcast episode',
  'Schedule your podcast episode',
  true,
  '30 mins',
  NOW(),
  NOW()
FROM journey_months WHERE month_number = 6
ON CONFLICT (task_identifier, month_id) DO NOTHING;

INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, estimated_time, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  'halfway_story',
  month_id,
  'Post your halfway transformation story',
  'Post your halfway transformation story',
  false,
  '2 hours',
  NOW(),
  NOW()
FROM journey_months WHERE month_number = 6
ON CONFLICT (task_identifier, month_id) DO NOTHING;

-- ============================================
-- MONTH 7: VISIBILITY
-- ============================================
INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, estimated_time, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  'submit_article_next',
  month_id,
  'Submit next article (if you haven''t already)',
  'Submit next article (if you haven''t already)',
  false,
  '3 hours',
  NOW(),
  NOW()
FROM journey_months WHERE month_number = 7
ON CONFLICT (task_identifier, month_id) DO NOTHING;

INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, estimated_time, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  'lead_second',
  month_id,
  'Host or lead an opportunity (if you haven''t completed the form already)',
  'Host or lead a second opportunity',
  false,
  '3 hours',
  NOW(),
  NOW()
FROM journey_months WHERE month_number = 7
ON CONFLICT (task_identifier, month_id) DO NOTHING;

INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, estimated_time, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  'post_4x_m7',
  month_id,
  'Post consistently: 4x this month',
  'Post consistently: 4x this month',
  false,
  '2 hours',
  NOW(),
  NOW()
FROM journey_months WHERE month_number = 7
ON CONFLICT (task_identifier, month_id) DO NOTHING;

-- ============================================
-- MONTH 8: EXPAND
-- ============================================
INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, estimated_time, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  'check_partners',
  month_id,
  'Check T4L Partners portal weekly',
  'Check T4L Partners portal weekly',
  false,
  '1 hour',
  NOW(),
  NOW()
FROM journey_months WHERE month_number = 8
ON CONFLICT (task_identifier, month_id) DO NOTHING;

INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, estimated_time, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  'update_speaker',
  month_id,
  'Update Speaker Materials',
  'Update speaker materials',
  true,
  '2 hours',
  NOW(),
  NOW()
FROM journey_months WHERE month_number = 8
ON CONFLICT (task_identifier, month_id) DO NOTHING;

INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, estimated_time, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  'speaking_pitch',
  month_id,
  'Submit speaking pitch (outside T4L)',
  'Submit speaking pitch (outside T4L)',
  false,
  '3 hours',
  NOW(),
  NOW()
FROM journey_months WHERE month_number = 8
ON CONFLICT (task_identifier, month_id) DO NOTHING;

INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, estimated_time, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  'update_impact_8',
  month_id,
  'Update impact log',
  'Update impact log',
  false,
  '45 mins',
  NOW(),
  NOW()
FROM journey_months WHERE month_number = 8
ON CONFLICT (task_identifier, month_id) DO NOTHING;

-- ============================================
-- MONTH 9: CONNECT
-- ============================================
INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, estimated_time, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  'quarterly_event_3',
  month_id,
  'Attend your Third quarterly networking event',
  'Attend quarterly networking event',
  true,
  '2 hours',
  NOW(),
  NOW()
FROM journey_months WHERE month_number = 9
ON CONFLICT (task_identifier, month_id) DO NOTHING;

INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, estimated_time, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  'follow_up_5',
  month_id,
  'Follow up with 5 people from event',
  'Follow up with 5 people from event',
  true,
  '1.5 hours',
  NOW(),
  NOW()
FROM journey_months WHERE month_number = 9
ON CONFLICT (task_identifier, month_id) DO NOTHING;

-- ============================================
-- MONTH 10: ACCELERATE
-- ============================================
INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, estimated_time, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  'submit_final',
  month_id,
  'Submit final articles',
  'Submit final articles',
  true,
  '3 hours',
  NOW(),
  NOW()
FROM journey_months WHERE month_number = 10
ON CONFLICT (task_identifier, month_id) DO NOTHING;

INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, estimated_time, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  'update_impact_10',
  month_id,
  'Update impact log',
  'Update impact log',
  true,
  '45 mins',
  NOW(),
  NOW()
FROM journey_months WHERE month_number = 10
ON CONFLICT (task_identifier, month_id) DO NOTHING;

INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, estimated_time, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  'apply_speaking',
  month_id,
  'Apply for 2+ speaking opportunities',
  'Apply for 2+ speaking opportunities',
  false,
  '3 hours',
  NOW(),
  NOW()
FROM journey_months WHERE month_number = 10
ON CONFLICT (task_identifier, month_id) DO NOTHING;

-- ============================================
-- MONTH 11: CELEBRATE
-- ============================================
INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, estimated_time, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  'quarterly_event_4',
  month_id,
  'Attend your Final quarterly networking event',
  'Attend quarterly event',
  true,
  '2 hours',
  NOW(),
  NOW()
FROM journey_months WHERE month_number = 11
ON CONFLICT (task_identifier, month_id) DO NOTHING;

INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, estimated_time, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  'final_impact',
  month_id,
  'Complete final impact log',
  'Complete final impact log',
  true,
  '2 hours',
  NOW(),
  NOW()
FROM journey_months WHERE month_number = 11
ON CONFLICT (task_identifier, month_id) DO NOTHING;

INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, estimated_time, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  'transformation_story',
  month_id,
  'Post full year transformation story',
  'Post full year transformation story',
  false,
  '3 hours',
  NOW(),
  NOW()
FROM journey_months WHERE month_number = 11
ON CONFLICT (task_identifier, month_id) DO NOTHING;

-- ============================================
-- MONTH 12: RENEW
-- ============================================
INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, estimated_time, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  'decide_renewal',
  month_id,
  'Decide on renewal (Top Voices, free tier, or alumni)',
  'Decide on renewal (Top Voices, free tier, or alumni)',
  false,
  '1 hour',
  NOW(),
  NOW()
FROM journey_months WHERE month_number = 12
ON CONFLICT (task_identifier, month_id) DO NOTHING;

INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, estimated_time, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  'schedule_call',
  month_id,
  'Schedule renewal call with T4L',
  'Schedule renewal call with T4L',
  false,
  '30 mins',
  NOW(),
  NOW()
FROM journey_months WHERE month_number = 12
ON CONFLICT (task_identifier, month_id) DO NOTHING;

-- ============================================
-- Verification Query
-- ============================================
-- Run this to verify all tasks were inserted:
-- SELECT 
--   jm.month_number,
--   jm.month_name,
--   jt.task_identifier,
--   jt.task_name,
--   jt.is_critical
-- FROM journey_tasks jt
-- JOIN journey_months jm ON jt.month_id = jm.month_id
-- ORDER BY jm.month_number, jt.task_identifier;
