-- ============================================================
-- Enable Row Level Security on all public tables
-- ============================================================
-- Why: Supabase linter flagged every table in the `public` schema
-- as RLS-disabled while exposed via PostgREST. Combined with the
-- anon key, that means anyone holding the anon key can read/write
-- everything.
--
-- How this works without breaking the app:
--   * The Node.js server uses the SUPABASE_SERVICE_ROLE_KEY,
--     which BYPASSES RLS. So server queries continue to work.
--   * RLS is enabled with NO policies, which means the anon and
--     authenticated roles get NOTHING. That's the correct posture
--     for a backend-only app where no client speaks to Supabase
--     directly.
--
-- Safe to re-run: ALTER TABLE ... ENABLE ROW LEVEL SECURITY is
-- idempotent.
-- ============================================================

ALTER TABLE public.certificates                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ambassador_journey_progress   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins                        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journey_months                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_participants            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.linkedin_audits               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_requests              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_opportunities         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ambassador_task_completion    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_info             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.impact_events                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_feedback              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_progress              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journey_progress              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts                         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users                         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partners                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journey_tasks                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ambassadors                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.impact_entries                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_configuration            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upload_batches                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_verification_tokens  ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Verification query (run after migration to confirm):
--
--   SELECT schemaname, tablename, rowsecurity
--   FROM pg_tables
--   WHERE schemaname = 'public'
--   ORDER BY tablename;
--
-- All rows should show rowsecurity = true.
-- ============================================================
