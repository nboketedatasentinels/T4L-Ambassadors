-- ============================================
-- Ensure journey_months + journey_tasks are populated
-- ============================================
-- Run this in Supabase SQL Editor
-- Uses WHERE NOT EXISTS (no unique constraint required). Includes display_order.
-- ============================================

-- 1) Ensure journey_months has rows (months 1-12)
INSERT INTO journey_months (month_number, month_name, description)
SELECT * FROM (VALUES
  (1, 'Foundation Building', 'Build your foundation with core courses and connections'),
  (2, 'Content Creation & Community Engagement', 'Start creating content and engaging with the community'),
  (3, 'ENGAGE', 'Attend events and share your transformation'),
  (4, 'LEAD', 'Take on leadership opportunities'),
  (5, 'AMPLIFY', 'Amplify your voice and impact'),
  (6, 'MIDPOINT', 'Halfway through your journey'),
  (7, 'VISIBILITY', 'Increase your visibility'),
  (8, 'EXPAND', 'Expand your reach and opportunities'),
  (9, 'CONNECT', 'Deepen connections and relationships'),
  (10, 'ACCELERATE', 'Accelerate your growth'),
  (11, 'CELEBRATE', 'Celebrate your achievements'),
  (12, 'RENEW', 'Decide on renewal and next steps')
) AS v(month_number, month_name, description)
WHERE NOT EXISTS (SELECT 1 FROM journey_months jm2 WHERE jm2.month_number = v.month_number);

-- 2) Populate journey_tasks with display_order (use jm.month_id for clarity)
-- MONTH 1
INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, display_order)
SELECT gen_random_uuid(), 'linkedin_course', jm.month_id, 'Complete LinkedIn Warrior Course', 'Complete the LinkedIn Warrior course to build your foundation', true, 1
FROM journey_months jm WHERE jm.month_number = 1
AND NOT EXISTS (SELECT 1 FROM journey_tasks jt WHERE jt.task_identifier = 'linkedin_course' AND jt.month_id = jm.month_id);
INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, display_order)
SELECT gen_random_uuid(), 'submit_profile', jm.month_id, 'Submit LinkedIn profile for audit', 'Submit your LinkedIn profile and speaker materials for audit', true, 2
FROM journey_months jm WHERE jm.month_number = 1
AND NOT EXISTS (SELECT 1 FROM journey_tasks jt WHERE jt.task_identifier = 'submit_profile' AND jt.month_id = jm.month_id);
INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, display_order)
SELECT gen_random_uuid(), 'second_course', jm.month_id, 'Complete Transformational Leadership Course', 'Choose and start second course (Transformational Leadership)', true, 3
FROM journey_months jm WHERE jm.month_number = 1
AND NOT EXISTS (SELECT 1 FROM journey_tasks jt WHERE jt.task_identifier = 'second_course' AND jt.month_id = jm.month_id);
INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, display_order)
SELECT gen_random_uuid(), 'connect_10', jm.month_id, 'Connect with 10 new people in your industry', 'Connect with 10 Ambassadors on LinkedIn', false, 4
FROM journey_months jm WHERE jm.month_number = 1
AND NOT EXISTS (SELECT 1 FROM journey_tasks jt WHERE jt.task_identifier = 'connect_10' AND jt.month_id = jm.month_id);
INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, display_order)
SELECT gen_random_uuid(), 'post_3x', jm.month_id, 'Announce your T4L Ambassador enrollment on LinkedIn', 'Post on LinkedIn 3x this month', false, 5
FROM journey_months jm WHERE jm.month_number = 1
AND NOT EXISTS (SELECT 1 FROM journey_tasks jt WHERE jt.task_identifier = 'post_3x' AND jt.month_id = jm.month_id);

-- MONTH 2
INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, display_order)
SELECT gen_random_uuid(), 'implement_audit', jm.month_id, 'Implement profile audit recommendations', 'Implement the recommendations from your profile audit', true, 1
FROM journey_months jm WHERE jm.month_number = 2
AND NOT EXISTS (SELECT 1 FROM journey_tasks jt WHERE jt.task_identifier = 'implement_audit' AND jt.month_id = jm.month_id);
INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, display_order)
SELECT gen_random_uuid(), 'third_course', jm.month_id, 'Complete Science of You: Personality & Strengths', 'Start third course: Science of You', true, 2
FROM journey_months jm WHERE jm.month_number = 2
AND NOT EXISTS (SELECT 1 FROM journey_tasks jt WHERE jt.task_identifier = 'third_course' AND jt.month_id = jm.month_id);
INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, display_order)
SELECT gen_random_uuid(), 'submit_article_1', jm.month_id, 'Submit your first article idea', 'Submit your first article (4-6 week review)', true, 3
FROM journey_months jm WHERE jm.month_number = 2
AND NOT EXISTS (SELECT 1 FROM journey_tasks jt WHERE jt.task_identifier = 'submit_article_1' AND jt.month_id = jm.month_id);
INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, display_order)
SELECT gen_random_uuid(), 'engage_15', jm.month_id, 'Engage with 15 posts across T4L community channels', 'Engage with 15 ambassador posts this month', false, 4
FROM journey_months jm WHERE jm.month_number = 2
AND NOT EXISTS (SELECT 1 FROM journey_tasks jt WHERE jt.task_identifier = 'engage_15' AND jt.month_id = jm.month_id);

-- MONTH 3
INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, display_order)
SELECT gen_random_uuid(), 'first_event', jm.month_id, 'Attend your first quarterly networking event', 'Attend your first quarterly networking event', true, 1
FROM journey_months jm WHERE jm.month_number = 3
AND NOT EXISTS (SELECT 1 FROM journey_tasks jt WHERE jt.task_identifier = 'first_event' AND jt.month_id = jm.month_id);
INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, display_order)
SELECT gen_random_uuid(), 'transformation_post', jm.month_id, 'Post transformation update on LinkedIn (90 days)', 'Post transformation update on LinkedIn (90 days)', false, 2
FROM journey_months jm WHERE jm.month_number = 3
AND NOT EXISTS (SELECT 1 FROM journey_tasks jt WHERE jt.task_identifier = 'transformation_post' AND jt.month_id = jm.month_id);
INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, display_order)
SELECT gen_random_uuid(), 'submit_article_2', jm.month_id, 'Submit second article (if first is published)', 'Submit second article (if first is published)', false, 3
FROM journey_months jm WHERE jm.month_number = 3
AND NOT EXISTS (SELECT 1 FROM journey_tasks jt WHERE jt.task_identifier = 'submit_article_2' AND jt.month_id = jm.month_id);
INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, display_order)
SELECT gen_random_uuid(), 'update_impact_log', jm.month_id, 'Update your impact log', 'Update your impact log', false, 4
FROM journey_months jm WHERE jm.month_number = 3
AND NOT EXISTS (SELECT 1 FROM journey_tasks jt WHERE jt.task_identifier = 'update_impact_log' AND jt.month_id = jm.month_id);

-- MONTH 4
INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, display_order)
SELECT gen_random_uuid(), 'volunteer', jm.month_id, 'Volunteer for a leadership opportunity', 'Volunteer for a leadership opportunity', true, 1
FROM journey_months jm WHERE jm.month_number = 4
AND NOT EXISTS (SELECT 1 FROM journey_tasks jt WHERE jt.task_identifier = 'volunteer' AND jt.month_id = jm.month_id);
INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, display_order)
SELECT gen_random_uuid(), 'complete_courses', jm.month_id, 'AI Stacking 101', 'Complete all 4 core courses', true, 2
FROM journey_months jm WHERE jm.month_number = 4
AND NOT EXISTS (SELECT 1 FROM journey_tasks jt WHERE jt.task_identifier = 'complete_courses' AND jt.month_id = jm.month_id);
INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, display_order)
SELECT gen_random_uuid(), 'request_recommendation', jm.month_id, 'Request letter of recommendation (if needed)', 'Request letter of recommendation (if needed)', false, 3
FROM journey_months jm WHERE jm.month_number = 4
AND NOT EXISTS (SELECT 1 FROM journey_tasks jt WHERE jt.task_identifier = 'request_recommendation' AND jt.month_id = jm.month_id);
INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, display_order)
SELECT gen_random_uuid(), 'post_4x', jm.month_id, 'Post 4x on LinkedIn this month', 'Post 4x on LinkedIn this month', false, 4
FROM journey_months jm WHERE jm.month_number = 4
AND NOT EXISTS (SELECT 1 FROM journey_tasks jt WHERE jt.task_identifier = 'post_4x' AND jt.month_id = jm.month_id);

-- MONTH 5
INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, display_order)
SELECT gen_random_uuid(), 'lead_something', jm.month_id, 'Lead or co-lead (book club, session, event)', 'Lead or co-lead something (book club, session, event). If you haven''t completed the form yet, please do so here', true, 1
FROM journey_months jm WHERE jm.month_number = 5
AND NOT EXISTS (SELECT 1 FROM journey_tasks jt WHERE jt.task_identifier = 'lead_something' AND jt.month_id = jm.month_id);
INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, display_order)
SELECT gen_random_uuid(), 'check_article', jm.month_id, 'Check article status and take action', 'Check article status and take action', true, 2
FROM journey_months jm WHERE jm.month_number = 5
AND NOT EXISTS (SELECT 1 FROM journey_tasks jt WHERE jt.task_identifier = 'check_article' AND jt.month_id = jm.month_id);
INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, display_order)
SELECT gen_random_uuid(), 'daily_engage', jm.month_id, 'Engage with Ambassadors content daily (5 min/day)', 'Engage with Ambassadors content daily (5 min/day)', false, 3
FROM journey_months jm WHERE jm.month_number = 5
AND NOT EXISTS (SELECT 1 FROM journey_tasks jt WHERE jt.task_identifier = 'daily_engage' AND jt.month_id = jm.month_id);
INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, display_order)
SELECT gen_random_uuid(), 'update_impact_5', jm.month_id, 'Update impact log', 'Update impact log', false, 4
FROM journey_months jm WHERE jm.month_number = 5
AND NOT EXISTS (SELECT 1 FROM journey_tasks jt WHERE jt.task_identifier = 'update_impact_5' AND jt.month_id = jm.month_id);

-- MONTH 6
INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, display_order)
SELECT gen_random_uuid(), 'quarterly_event_2', jm.month_id, 'Attend your second quarterly networking event', 'Attend quarterly networking event', true, 1
FROM journey_months jm WHERE jm.month_number = 6
AND NOT EXISTS (SELECT 1 FROM journey_tasks jt WHERE jt.task_identifier = 'quarterly_event_2' AND jt.month_id = jm.month_id);
INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, display_order)
SELECT gen_random_uuid(), 'schedule_podcast', jm.month_id, 'Schedule your podcast episode', 'Schedule your podcast episode', true, 2
FROM journey_months jm WHERE jm.month_number = 6
AND NOT EXISTS (SELECT 1 FROM journey_tasks jt WHERE jt.task_identifier = 'schedule_podcast' AND jt.month_id = jm.month_id);
INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, display_order)
SELECT gen_random_uuid(), 'halfway_story', jm.month_id, 'Post your halfway transformation story', 'Post your halfway transformation story', false, 3
FROM journey_months jm WHERE jm.month_number = 6
AND NOT EXISTS (SELECT 1 FROM journey_tasks jt WHERE jt.task_identifier = 'halfway_story' AND jt.month_id = jm.month_id);

-- MONTH 7
INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, display_order)
SELECT gen_random_uuid(), 'submit_article_next', jm.month_id, 'Submit next article (if you haven''t already)', 'Submit next article (if you haven''t already)', false, 1
FROM journey_months jm WHERE jm.month_number = 7
AND NOT EXISTS (SELECT 1 FROM journey_tasks jt WHERE jt.task_identifier = 'submit_article_next' AND jt.month_id = jm.month_id);
INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, display_order)
SELECT gen_random_uuid(), 'lead_second', jm.month_id, 'Host or lead an opportunity (if you haven''t completed the form already)', 'Host or lead a second opportunity', false, 2
FROM journey_months jm WHERE jm.month_number = 7
AND NOT EXISTS (SELECT 1 FROM journey_tasks jt WHERE jt.task_identifier = 'lead_second' AND jt.month_id = jm.month_id);
INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, display_order)
SELECT gen_random_uuid(), 'post_4x_m7', jm.month_id, 'Post consistently: 4x this month', 'Post consistently: 4x this month', false, 3
FROM journey_months jm WHERE jm.month_number = 7
AND NOT EXISTS (SELECT 1 FROM journey_tasks jt WHERE jt.task_identifier = 'post_4x_m7' AND jt.month_id = jm.month_id);

-- MONTH 8
INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, display_order)
SELECT gen_random_uuid(), 'check_partners', jm.month_id, 'Check T4L Partners portal weekly', 'Check T4L Partners portal weekly', false, 1
FROM journey_months jm WHERE jm.month_number = 8
AND NOT EXISTS (SELECT 1 FROM journey_tasks jt WHERE jt.task_identifier = 'check_partners' AND jt.month_id = jm.month_id);
INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, display_order)
SELECT gen_random_uuid(), 'update_speaker', jm.month_id, 'Update Speaker Materials', 'Update speaker materials', true, 2
FROM journey_months jm WHERE jm.month_number = 8
AND NOT EXISTS (SELECT 1 FROM journey_tasks jt WHERE jt.task_identifier = 'update_speaker' AND jt.month_id = jm.month_id);
INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, display_order)
SELECT gen_random_uuid(), 'speaking_pitch', jm.month_id, 'Submit speaking pitch (outside T4L)', 'Submit speaking pitch (outside T4L)', false, 3
FROM journey_months jm WHERE jm.month_number = 8
AND NOT EXISTS (SELECT 1 FROM journey_tasks jt WHERE jt.task_identifier = 'speaking_pitch' AND jt.month_id = jm.month_id);
INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, display_order)
SELECT gen_random_uuid(), 'update_impact_8', jm.month_id, 'Update impact log', 'Update impact log', false, 4
FROM journey_months jm WHERE jm.month_number = 8
AND NOT EXISTS (SELECT 1 FROM journey_tasks jt WHERE jt.task_identifier = 'update_impact_8' AND jt.month_id = jm.month_id);

-- MONTH 9
INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, display_order)
SELECT gen_random_uuid(), 'quarterly_event_3', jm.month_id, 'Attend your Third quarterly networking event', 'Attend quarterly networking event', true, 1
FROM journey_months jm WHERE jm.month_number = 9
AND NOT EXISTS (SELECT 1 FROM journey_tasks jt WHERE jt.task_identifier = 'quarterly_event_3' AND jt.month_id = jm.month_id);
INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, display_order)
SELECT gen_random_uuid(), 'follow_up_5', jm.month_id, 'Follow up with 5 people from event', 'Follow up with 5 people from event', true, 2
FROM journey_months jm WHERE jm.month_number = 9
AND NOT EXISTS (SELECT 1 FROM journey_tasks jt WHERE jt.task_identifier = 'follow_up_5' AND jt.month_id = jm.month_id);

-- MONTH 10
INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, display_order)
SELECT gen_random_uuid(), 'submit_final', jm.month_id, 'Submit final articles', 'Submit final articles', true, 1
FROM journey_months jm WHERE jm.month_number = 10
AND NOT EXISTS (SELECT 1 FROM journey_tasks jt WHERE jt.task_identifier = 'submit_final' AND jt.month_id = jm.month_id);
INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, display_order)
SELECT gen_random_uuid(), 'update_impact_10', jm.month_id, 'Update impact log', 'Update impact log', true, 2
FROM journey_months jm WHERE jm.month_number = 10
AND NOT EXISTS (SELECT 1 FROM journey_tasks jt WHERE jt.task_identifier = 'update_impact_10' AND jt.month_id = jm.month_id);
INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, display_order)
SELECT gen_random_uuid(), 'apply_speaking', jm.month_id, 'Apply for 2+ speaking opportunities', 'Apply for 2+ speaking opportunities', false, 3
FROM journey_months jm WHERE jm.month_number = 10
AND NOT EXISTS (SELECT 1 FROM journey_tasks jt WHERE jt.task_identifier = 'apply_speaking' AND jt.month_id = jm.month_id);

-- MONTH 11
INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, display_order)
SELECT gen_random_uuid(), 'quarterly_event_4', jm.month_id, 'Attend your Final quarterly networking event', 'Attend quarterly event', true, 1
FROM journey_months jm WHERE jm.month_number = 11
AND NOT EXISTS (SELECT 1 FROM journey_tasks jt WHERE jt.task_identifier = 'quarterly_event_4' AND jt.month_id = jm.month_id);
INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, display_order)
SELECT gen_random_uuid(), 'final_impact', jm.month_id, 'Complete final impact log', 'Complete final impact log', true, 2
FROM journey_months jm WHERE jm.month_number = 11
AND NOT EXISTS (SELECT 1 FROM journey_tasks jt WHERE jt.task_identifier = 'final_impact' AND jt.month_id = jm.month_id);
INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, display_order)
SELECT gen_random_uuid(), 'transformation_story', jm.month_id, 'Post full year transformation story', 'Post full year transformation story', false, 3
FROM journey_months jm WHERE jm.month_number = 11
AND NOT EXISTS (SELECT 1 FROM journey_tasks jt WHERE jt.task_identifier = 'transformation_story' AND jt.month_id = jm.month_id);

-- MONTH 12
INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, display_order)
SELECT gen_random_uuid(), 'decide_renewal', jm.month_id, 'Decide on renewal (Top Voices, free tier, or alumni)', 'Decide on renewal (Top Voices, free tier, or alumni)', false, 1
FROM journey_months jm WHERE jm.month_number = 12
AND NOT EXISTS (SELECT 1 FROM journey_tasks jt WHERE jt.task_identifier = 'decide_renewal' AND jt.month_id = jm.month_id);
INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, display_order)
SELECT gen_random_uuid(), 'schedule_call', jm.month_id, 'Schedule renewal call with T4L', 'Schedule renewal call with T4L', false, 2
FROM journey_months jm WHERE jm.month_number = 12
AND NOT EXISTS (SELECT 1 FROM journey_tasks jt WHERE jt.task_identifier = 'schedule_call' AND jt.month_id = jm.month_id);
