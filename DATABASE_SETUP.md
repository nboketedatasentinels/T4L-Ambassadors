# Database Setup Guide

This guide will help you set up the complete database schema for the T4L Ambassador platform using raw SQL.

## Prerequisites

- PostgreSQL database (version 12 or higher recommended)
- Database access credentials (host, port, database name, username, password)
- psql command-line tool or a database management tool (pgAdmin, DBeaver, etc.)

## Quick Start

### Option 1: Using psql (Command Line)

```bash
# Connect to your PostgreSQL database
psql -h localhost -U your_username -d your_database_name

# Run the schema file
\i database-schema.sql

# Or from command line directly:
psql -h localhost -U your_username -d your_database_name -f database-schema.sql
```

### Option 2: Using pgAdmin

1. Open pgAdmin
2. Connect to your PostgreSQL server
3. Right-click on your database
4. Select "Query Tool"
5. Open `database-schema.sql` file
6. Click "Execute" (F5)

### Option 3: Using DBeaver or Other GUI Tools

1. Connect to your PostgreSQL database
2. Open a new SQL script
3. Copy and paste the contents of `database-schema.sql`
4. Execute the script

## What This Schema Creates

The SQL script creates the following database structure:

### Core Tables

1. **users** - Central authentication table for all user types
2. **ambassadors** - Ambassador profile information
3. **partners** - Partner organization information
4. **admins** - Admin user information

### Feature Tables

5. **services** - Services offered by partners
6. **service_requests** - Requests from ambassadors for services
7. **applications** - Job/opportunity applications from ambassadors
8. **posts** - Posts/opportunities created by partners
9. **articles** - Articles written by ambassadors
10. **notifications** - System notifications for users
11. **sessions** - User authentication sessions
12. **linkedin_audits** - LinkedIn profile audit records
13. **certificates** - Course completion certificates

### Journey System Tables

14. **journey_months** - 12 months of the ambassador journey (pre-populated)
15. **journey_tasks** - All tasks for each month (48 tasks total, pre-populated)
16. **ambassador_journey_progress** - Progress tracking per ambassador per month
17. **ambassador_task_completion** - Task completion status
18. **journey_progress** - Legacy journey progress table (for backward compatibility)

## Verification

After running the schema, verify the setup with these queries:

```sql
-- Check that all tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Verify journey months were created
SELECT month_number, month_name FROM journey_months ORDER BY month_number;

-- Verify journey tasks were populated (should show 48 tasks)
SELECT 
  jm.month_number,
  jm.month_name,
  COUNT(jt.task_id) as task_count
FROM journey_months jm
LEFT JOIN journey_tasks jt ON jm.month_id = jt.month_id
GROUP BY jm.month_number, jm.month_name
ORDER BY jm.month_number;

-- Check indexes were created
SELECT 
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

## Important Notes

### Foreign Key Relationships

The schema includes proper foreign key relationships with CASCADE deletes:
- Deleting a user will cascade delete their ambassador/partner/admin profile
- Deleting an ambassador will cascade delete their progress, tasks, certificates, etc.
- Deleting a service will cascade delete related service requests

### Constraints

- **users.user_type**: Must be 'ambassador', 'partner', or 'admin'
- **users.status**: Must be 'active', 'inactive', 'suspended', or 'pending'
- **ambassadors.subscription_type**: Must be 'free' or 'paid'
- **notifications**: Has a complex constraint allowing either exactly one reference field OR no reference fields

### UUID Generation

The schema uses PostgreSQL's `uuid-ossp` extension for UUID generation. If you encounter errors:
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### Pre-populated Data

The schema automatically:
- Creates 12 journey months (Month 1 through Month 12)
- Populates 48 journey tasks across all 12 months
- Sets up all necessary indexes for performance

## Updating Your Application

After creating the database schema, you'll need to update your application's database connection:

### Update `.env` file

```env
# If using a new PostgreSQL database instead of Supabase
DATABASE_URL=postgresql://username:password@localhost:5432/your_database_name

# Or if you want to keep using Supabase but with a new project
SUPABASE_URL=https://your-new-project.supabase.co
SUPABASE_ANON_KEY=your-new-anon-key
```

### Update `models/db.js`

If you're switching from Supabase to raw PostgreSQL, you'll need to:
1. Install `pg` package: `npm install pg`
2. Update the database connection code to use `pg` instead of `@supabase/supabase-js`
3. Update all query methods to use raw SQL instead of Supabase client methods

## Troubleshooting

### Error: "extension uuid-ossp does not exist"

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### Error: "relation already exists"

The script uses `CREATE TABLE IF NOT EXISTS`, so it's safe to run multiple times. However, if you need to start fresh:

```sql
-- WARNING: This will delete all data!
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO your_username;
```

Then run `database-schema.sql` again.

### Error: "permission denied"

Make sure your database user has the necessary permissions:

```sql
GRANT ALL PRIVILEGES ON DATABASE your_database_name TO your_username;
GRANT ALL PRIVILEGES ON SCHEMA public TO your_username;
```

## Next Steps

1. ✅ Run the schema script
2. ✅ Verify all tables were created
3. ✅ Update your application's database connection
4. ✅ Test the application with the new database
5. ✅ Migrate any existing data (if applicable)

## Support

If you encounter issues:
1. Check PostgreSQL logs for detailed error messages
2. Verify your database user has proper permissions
3. Ensure PostgreSQL version is 12 or higher
4. Check that the `uuid-ossp` extension is available

## Schema Summary

- **18 tables** total
- **12 journey months** pre-populated
- **48 journey tasks** pre-populated
- **Proper indexes** on all foreign keys and commonly queried columns
- **CASCADE deletes** for data integrity
- **Check constraints** for data validation
