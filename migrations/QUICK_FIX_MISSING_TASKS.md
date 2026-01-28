# Quick Fix: Missing Tasks (404 Errors)

## Problem
Tasks are returning **404 (Not Found)** when trying to toggle them. The error message is:
```
❌ Error toggling task: Error: Task not found
```

## Root Cause
The `journey_tasks` table is missing some tasks that the frontend expects. Specifically, `second_course` (Complete Transformational Leadership Course) is missing or not properly linked to month 1.

## Quick Fix

### Option 1: Run the Verification Script (Recommended)

1. **Open Supabase Dashboard** → SQL Editor
2. **Run the verification script:**
   ```sql
   -- Check what tasks exist
   SELECT 
     jm.month_number,
     jt.task_identifier,
     jt.task_name
   FROM journey_tasks jt
   JOIN journey_months jm ON jt.month_id = jm.month_id
   WHERE jm.month_number = 1
   ORDER BY jt.task_identifier;
   ```

3. **If `second_course` is missing**, run this:
   ```sql
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
   ```

### Option 2: Run the Full Migration Script

If you haven't run the full migration yet, run `migrations/populate-journey-tasks.sql` which includes all 48 tasks.

### Option 3: Quick Add Missing Task (One-Liner)

```sql
DO $$
DECLARE v_month_id UUID;
BEGIN
    SELECT month_id INTO v_month_id FROM journey_months WHERE month_number = 1;
    
    INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, estimated_time, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      'second_course',
      v_month_id,
      'Complete Transformational Leadership Course',
      'Complete Transformational Leadership Course',
      true,
      '3 hours',
      NOW(),
      NOW()
    )
    ON CONFLICT (task_identifier, month_id) DO NOTHING;
    
    RAISE NOTICE 'Task second_course added for month 1';
END $$;
```

## Verification

After running the fix, verify the task exists:

```sql
SELECT 
  jt.task_identifier,
  jt.task_name,
  jm.month_number,
  jm.month_name
FROM journey_tasks jt
JOIN journey_months jm ON jt.month_id = jm.month_id
WHERE jt.task_identifier = 'second_course';
```

You should see:
- `task_identifier`: `second_course`
- `task_name`: `Complete Transformational Leadership Course`
- `month_number`: `1`

## Expected Tasks for Month 1

The frontend expects these 5 tasks for Month 1:

1. ✅ `linkedin_course` - Complete LinkedIn Warrior Course
2. ✅ `submit_profile` - Submit LinkedIn profile for audit
3. ❌ `second_course` - Complete Transformational Leadership Course (MISSING)
4. ✅ `connect_10` - Connect with 10 new people in your industry
5. ✅ `post_3x` - Announce your T4L Ambassador enrollment on LinkedIn

## Troubleshooting

### If the task still doesn't work after adding:

1. **Check the unique constraint:**
   ```sql
   -- See what constraints exist
   SELECT 
     conname as constraint_name,
     contype as constraint_type
   FROM pg_constraint
   WHERE conrelid = 'journey_tasks'::regclass;
   ```

2. **Check if task exists but with wrong month_id:**
   ```sql
   SELECT 
     jt.*,
     jm.month_number
   FROM journey_tasks jt
   LEFT JOIN journey_months jm ON jt.month_id = jm.month_id
   WHERE jt.task_identifier = 'second_course';
   ```

3. **Check for duplicate task_identifiers:**
   ```sql
   SELECT task_identifier, COUNT(*) as count
   FROM journey_tasks
   GROUP BY task_identifier
   HAVING COUNT(*) > 1;
   ```

## After Fix

1. **Restart your server** (if needed)
2. **Refresh the journey page** (hard refresh: Ctrl+Shift+R / Cmd+Shift+R)
3. **Try toggling the task** - it should work now!

## Next Steps

If you're missing other tasks from other months, run the full `populate-journey-tasks.sql` script to ensure all 48 tasks are in the database.
