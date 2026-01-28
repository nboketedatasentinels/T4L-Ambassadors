# Column Name Fix Verification

## ✅ Fix Applied

The backend code has been updated to use the correct column names:
- `title` → `task_name` ✅
- `description` → `task_description` ✅

**Location:** `server.js` lines 6628-6629

## 🔍 Verification Steps

### Step 1: Verify the Fix in Code

The query should look like this:

```javascript
.select(`
  *,
  journey_tasks (
    task_id,
    task_identifier,
    month_id,
    task_name,        // ✅ CORRECT
    task_description   // ✅ CORRECT
  )
`)
```

### Step 2: Restart Your Server

**IMPORTANT:** After making code changes, you MUST restart your Node.js server:

```bash
# Stop the server (Ctrl+C)
# Then restart it
node server.js
# or
npm start
```

### Step 3: Clear Browser Cache

1. Open browser DevTools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"
4. Or use Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)

### Step 4: Test the Endpoint

Try accessing the endpoint directly:
```
GET /api/journey/progress
```

You should get JSON, not HTML. If you still get HTML, check:
1. Server logs for errors
2. Network tab in DevTools for the actual response
3. That you're authenticated (check cookies)

## 🐛 If Error Persists

### Check Server Logs

Look for these specific errors:
```
❌ Error fetching task completions: column journey_tasks_1.title does not exist
```

If you see this, it means:
1. Server wasn't restarted after code change, OR
2. There's another query we haven't found yet

### Search for All Instances

Run this in your terminal to find any remaining instances:

```bash
grep -n "journey_tasks" server.js | grep -i "title\|description"
```

This will show you all places where `journey_tasks` is queried with `title` or `description`.

### Check Database Schema

Verify your actual table structure:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'journey_tasks'
ORDER BY ordinal_position;
```

Expected columns:
- `task_id`
- `task_identifier`
- `month_id`
- `task_name` ✅ (NOT `title`)
- `task_description` ✅ (NOT `description`)
- `is_critical`
- `estimated_time`
- `created_at`
- `updated_at`

## 🔧 Quick Fix Script

If you want to double-check, here's a script to verify all queries:

```bash
# Find all journey_tasks queries
grep -A 10 "journey_tasks" server.js | grep -E "title|description|task_name|task_description"
```

This will show you if there are any remaining issues.

## ✅ Success Indicators

After the fix, you should see:
1. ✅ Server starts without errors
2. ✅ `/api/journey/progress` returns JSON (not HTML)
3. ✅ Browser console shows: `✅ Journey data loaded:`
4. ✅ No "column does not exist" errors in server logs
5. ✅ Tasks load correctly on the journey page

## 📝 Notes

- Supabase uses nested selects for joins, so the column names must match exactly
- The error "journey_tasks_1.title" means Supabase is trying to access a column that doesn't exist
- Always restart the server after code changes
- Clear browser cache if you see cached errors
