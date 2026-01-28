# ✅ Corrected Task Fix Script

## ⚠️ Important: Schema Correction

The user's original SQL script used incorrect column names:
- ❌ `estimated_hours` (doesn't exist)
- ❌ `task_order` (doesn't exist)

**Correct schema:**
- ✅ `estimated_time` (text, e.g., '3 hours')
- ✅ No `task_order` column (tasks are ordered by insertion or by frontend)

## Quick Fix (Corrected)

Run this SQL in your Supabase SQL Editor:

```sql
-- Add missing Month 1 tasks (corrected schema)
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
```

## Complete Fix Script

For a complete diagnostic and fix script, use:
**`migrations/fix-month1-tasks.sql`**

This script:
1. ✅ Checks what tasks exist
2. ✅ Identifies missing tasks
3. ✅ Adds missing tasks with correct schema
4. ✅ Verifies all tasks were added

## Schema Reference

The `journey_tasks` table uses:
- `task_id` (UUID, primary key)
- `task_identifier` (text, unique per month)
- `month_id` (UUID, foreign key)
- `task_name` (text)
- `task_description` (text)
- `is_critical` (boolean)
- `estimated_time` (text, e.g., '2 hours', '30 mins')
- `created_at` (timestamp)
- `updated_at` (timestamp)

**Unique constraint:** `(task_identifier, month_id)`

## Verification

After running the fix, verify with:

```sql
SELECT 
  task_identifier,
  task_name,
  is_critical,
  estimated_time
FROM journey_tasks 
WHERE month_id = (SELECT month_id FROM journey_months WHERE month_number = 1)
ORDER BY task_identifier;
```

You should see all 5 tasks:
1. ✅ `connect_10`
2. ✅ `linkedin_course`
3. ✅ `post_3x`
4. ✅ `second_course`
5. ✅ `submit_profile`
