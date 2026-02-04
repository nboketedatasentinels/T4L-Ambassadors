-- ============================================
-- FIX: PostgreSQL requires typed arrays (e.g. TEXT[]), not bare "ARRAY"
-- Use this if you get: syntax error at or near "ARRAY" on strengths/areas_for_improvement/recommendations
-- ============================================
-- Option A: If the table does NOT exist yet, use the corrected CREATE TABLE below.
-- Option B: If the table already exists without these columns, add them with:
--   ALTER TABLE linkedin_audits ADD COLUMN IF NOT EXISTS strengths TEXT[];
--   ALTER TABLE linkedin_audits ADD COLUMN IF NOT EXISTS areas_for_improvement TEXT[];
--   ALTER TABLE linkedin_audits ADD COLUMN IF NOT EXISTS recommendations TEXT[];

-- Corrected full CREATE TABLE (use when creating from scratch):
CREATE TABLE IF NOT EXISTS public.linkedin_audits (
  audit_id uuid NOT NULL DEFAULT gen_random_uuid(),
  ambassador_id uuid NOT NULL,
  admin_id uuid NOT NULL,
  profile_completeness_score integer,
  headline_strength_score integer,
  about_section_score integer,
  experience_section_score integer,
  education_section_score integer,
  skills_section_score integer,
  recommendations_score integer,
  connections_score integer,
  engagement_score integer,
  content_quality_score integer,
  overall_score integer,
  strengths TEXT[],
  areas_for_improvement TEXT[],
  recommendations TEXT[],
  notes text,
  status character varying DEFAULT 'submitted'::character varying CHECK (status::text = ANY (ARRAY['pending'::character varying, 'submitted'::character varying, 'reviewed'::character varying, 'completed'::character varying, 'approved'::character varying]::text[])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  feedback text NOT NULL DEFAULT '',
  submitted_by uuid,
  submitted_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  speaker_bio_url text,
  linkedin_url text,
  CONSTRAINT linkedin_audits_pkey PRIMARY KEY (audit_id),
  CONSTRAINT linkedin_audits_ambassador_id_fkey FOREIGN KEY (ambassador_id) REFERENCES public.ambassadors(ambassador_id),
  CONSTRAINT linkedin_audits_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.admins(admin_id)
);
