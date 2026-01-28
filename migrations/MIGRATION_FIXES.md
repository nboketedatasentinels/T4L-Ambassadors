# Journey Progress Migration - Fixes Applied

## ✅ Fix 1: Backend Column Names (COMPLETED)

**Problem:** Backend was trying to SELECT `title` and `description` from `journey_tasks` table, but the actual columns are `task_name` and `task_description`.

**Solution:** Updated `server.js` line 6628-6629:
- Changed `title` → `task_name`
- Changed `description` → `task_description`

**File Changed:**
- `server.js` (line ~6624-6630)

## 📋 Fix 2: Missing Tasks in Database (ACTION REQUIRED)

**Problem:** Frontend uses task IDs that don't exist in the database:
- ❌ `connect_10`
- ❌ `second_course`
- ❌ `post_3x`
- And many more...

**Solution:** Created SQL migration script to populate all tasks.

**File Created:**
- `migrations/populate-journey-tasks.sql`

## 🚀 Next Steps

### Step 1: Run the SQL Migration

1. **Connect to your Supabase database** (via Supabase Dashboard → SQL Editor)

2. **Verify journey_months table has all 12 months:**
   ```sql
   SELECT month_id, month_number, month_name 
   FROM journey_months 
   ORDER BY month_number;
   ```
   
   If months are missing, you'll need to add them first.

3. **Run the migration script:**
   - Open `migrations/populate-journey-tasks.sql`
   - Copy and paste into Supabase SQL Editor
   - Execute the script

4. **Verify tasks were inserted:**
   ```sql
   SELECT 
     jm.month_number,
     jm.month_name,
     jt.task_identifier,
     jt.task_name,
     jt.is_critical
   FROM journey_tasks jt
   JOIN journey_months jm ON jt.month_id = jm.month_id
   ORDER BY jm.month_number, jt.task_identifier;
   ```

### Step 2: Test the Application

1. **Restart your server** (if needed)
2. **Clear browser localStorage** (or let the migration run automatically)
3. **Test task completion:**
   - Try completing a task
   - Check server logs for errors
   - Verify task appears as completed after page refresh

### Step 3: Verify Database Structure

Ensure your `journey_tasks` table has these columns:
- `task_id` (UUID, primary key)
- `task_identifier` (text, unique per month)
- `month_id` (UUID, foreign key to journey_months)
- `task_name` (text)
- `task_description` (text)
- `is_critical` (boolean)
- `estimated_time` (text, optional)
- `created_at`, `updated_at` (timestamps)

## 📊 Complete Task List

The migration script includes all 48 tasks across 12 months:

**Month 1 (5 tasks):**
- linkedin_course
- submit_profile
- second_course
- connect_10
- post_3x

**Month 2 (4 tasks):**
- implement_audit
- third_course
- submit_article_1
- engage_15

**Month 3 (4 tasks):**
- first_event
- transformation_post
- submit_article_2
- update_impact_log

**Month 4 (4 tasks):**
- volunteer
- complete_courses
- request_recommendation
- post_4x

**Month 5 (4 tasks):**
- lead_something
- check_article
- daily_engage
- update_impact_5

**Month 6 (3 tasks):**
- quarterly_event_2
- schedule_podcast
- halfway_story

**Month 7 (3 tasks):**
- submit_article_next
- lead_second
- post_4x_m7

**Month 8 (4 tasks):**
- check_partners
- update_speaker
- speaking_pitch
- update_impact_8

**Month 9 (2 tasks):**
- quarterly_event_3
- follow_up_5

**Month 10 (3 tasks):**
- submit_final
- update_impact_10
- apply_speaking

**Month 11 (3 tasks):**
- quarterly_event_4
- final_impact
- transformation_story

**Month 12 (2 tasks):**
- decide_renewal
- schedule_call

## ⚠️ Important Notes

1. **Unique Constraint:** The script uses `ON CONFLICT (task_identifier, month_id) DO NOTHING` to prevent duplicates. If you run it multiple times, it won't create duplicates.

2. **Month IDs:** The script uses a subquery to find `month_id` from `journey_months` table based on `month_number`. This assumes your `journey_months` table is already populated.

3. **UUID Generation:** Uses `gen_random_uuid()` for PostgreSQL. If using a different database, adjust accordingly.

4. **Testing:** After running the migration, test with a real user account to ensure tasks can be toggled and saved correctly.

## 🔍 Troubleshooting

### Error: "relation journey_months does not exist"
- You need to create the `journey_months` table first
- Or check if the table name is different

### Error: "column month_id does not exist"
- Check your `journey_tasks` table structure
- Ensure foreign key relationship is set up correctly

### Tasks still not found after migration
- Check that `task_identifier` values match exactly (case-sensitive)
- Verify the `month_id` foreign key is correct
- Check server logs for specific error messages

## ✅ Success Criteria

After completing these fixes:
- ✅ No more "column title does not exist" errors
- ✅ All tasks from frontend exist in database
- ✅ Tasks can be toggled and saved successfully
- ✅ Progress persists across page refreshes
- ✅ Migration from localStorage works correctly
