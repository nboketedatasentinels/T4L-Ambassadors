-- ============================================
-- T4L Ambassador Platform - Complete Database Schema
-- ============================================
-- This script creates all tables, relationships, indexes, and constraints
-- for the T4L Ambassador platform.
-- 
-- Run this script in your PostgreSQL database to recreate the entire schema.
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. USERS TABLE (Central user authentication)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('ambassador', 'partner', 'admin')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'pending')),
    access_code VARCHAR(50) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_access_code ON users(access_code);

-- ============================================
-- 2. AMBASSADORS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS ambassadors (
    ambassador_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    gender VARCHAR(20),
    whatsapp_number VARCHAR(20),
    country VARCHAR(100),
    state VARCHAR(100),
    continent VARCHAR(50),
    cv_filename VARCHAR(255),
    professional_headline TEXT,
    professional_summary TEXT,
    linkedin_profile_url TEXT,
    speaker_profile_url TEXT,
    data_sharing_consent BOOLEAN DEFAULT FALSE,
    profile_completion_percentage INTEGER DEFAULT 0,
    subscription_type VARCHAR(20) DEFAULT 'free' CHECK (subscription_type IN ('free', 'paid')),
    generated_password TEXT,
    linkedin_audit_reminder_sent_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ambassadors_user_id ON ambassadors(user_id);
CREATE INDEX IF NOT EXISTS idx_ambassadors_email ON ambassadors(email);
CREATE INDEX IF NOT EXISTS idx_ambassadors_subscription_type ON ambassadors(subscription_type);

-- ============================================
-- 3. PARTNERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS partners (
    partner_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    organization_name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(100),
    phone_number VARCHAR(20),
    location VARCHAR(255),
    partner_type VARCHAR(50),
    generated_password TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_partners_user_id ON partners(user_id);
CREATE INDEX IF NOT EXISTS idx_partners_organization_name ON partners(organization_name);

-- ============================================
-- 4. ADMINS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS admins (
    admin_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    first_name VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admins_user_id ON admins(user_id);

-- ============================================
-- 5. SERVICES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS services (
    service_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    partner_id UUID NOT NULL REFERENCES partners(partner_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'draft')),
    capacity INTEGER DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_services_partner_id ON services(partner_id);
CREATE INDEX IF NOT EXISTS idx_services_status ON services(status);
CREATE INDEX IF NOT EXISTS idx_services_type ON services(type);

-- ============================================
-- 6. SERVICE_REQUESTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS service_requests (
    request_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_id UUID NOT NULL REFERENCES services(service_id) ON DELETE CASCADE,
    ambassador_id UUID NOT NULL REFERENCES ambassadors(ambassador_id) ON DELETE CASCADE,
    partner_id UUID NOT NULL REFERENCES partners(partner_id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'cancelled')),
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_service_requests_service_id ON service_requests(service_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_ambassador_id ON service_requests(ambassador_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_partner_id ON service_requests(partner_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON service_requests(status);

-- ============================================
-- 7. APPLICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS applications (
    application_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ambassador_id UUID NOT NULL REFERENCES ambassadors(ambassador_id) ON DELETE CASCADE,
    post_id UUID,
    partner_id UUID REFERENCES partners(partner_id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'approved', 'rejected', 'withdrawn')),
    cv_filename VARCHAR(255),
    cover_letter TEXT,
    additional_info TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_applications_ambassador_id ON applications(ambassador_id);
CREATE INDEX IF NOT EXISTS idx_applications_post_id ON applications(post_id);
CREATE INDEX IF NOT EXISTS idx_applications_partner_id ON applications(partner_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);

-- ============================================
-- 8. POSTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS posts (
    post_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    partner_id UUID NOT NULL REFERENCES partners(partner_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(50) DEFAULT 'general',
    location VARCHAR(255),
    deadline TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_posts_partner_id ON posts(partner_id);
CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);

-- ============================================
-- 9. ARTICLES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS articles (
    article_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ambassador_id UUID NOT NULL REFERENCES ambassadors(ambassador_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    excerpt TEXT,
    category VARCHAR(50) DEFAULT 'general',
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'published', 'rejected')),
    author_name VARCHAR(255),
    author_role VARCHAR(50),
    views INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_articles_ambassador_id ON articles(ambassador_id);
CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category);
CREATE INDEX IF NOT EXISTS idx_articles_created_at ON articles(created_at DESC);

-- ============================================
-- 10. NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
    notification_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_id UUID NOT NULL,
    recipient_type VARCHAR(20) NOT NULL CHECK (recipient_type IN ('ambassador', 'partner', 'admin')),
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    link VARCHAR(500),
    read BOOLEAN DEFAULT FALSE,
    application_id UUID REFERENCES applications(application_id) ON DELETE CASCADE,
    request_id UUID REFERENCES service_requests(request_id) ON DELETE CASCADE,
    article_id UUID REFERENCES articles(article_id) ON DELETE CASCADE,
    certificate_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id, recipient_type);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- Constraint: Allow notifications with exactly one reference OR no references
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_reference_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_reference_check CHECK (
  (
    (application_id IS NOT NULL)::int + 
    (request_id IS NOT NULL)::int + 
    (article_id IS NOT NULL)::int + 
    (COALESCE(certificate_id, NULL) IS NOT NULL)::int = 1
  ) OR (
    application_id IS NULL AND 
    request_id IS NULL AND 
    article_id IS NULL AND 
    certificate_id IS NULL
  )
);

-- ============================================
-- 11. SESSIONS TABLE (session_id stores the token string)
-- ============================================
CREATE TABLE IF NOT EXISTS sessions (
    session_id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('ambassador', 'partner', 'admin')),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- ============================================
-- 12. LINKEDIN_AUDITS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS linkedin_audits (
    audit_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ambassador_id UUID NOT NULL REFERENCES ambassadors(ambassador_id) ON DELETE CASCADE,
    admin_id UUID REFERENCES admins(admin_id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'reviewed', 'completed', 'approved', 'in_progress', 'cancelled')),
    notes TEXT,
    recommendations TEXT,
    score INTEGER CHECK (score >= 0 AND score <= 100),
    feedback TEXT NOT NULL DEFAULT '',
    linkedin_url TEXT,
    speaker_bio_url TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_linkedin_audits_ambassador_id ON linkedin_audits(ambassador_id);
CREATE INDEX IF NOT EXISTS idx_linkedin_audits_admin_id ON linkedin_audits(admin_id);
CREATE INDEX IF NOT EXISTS idx_linkedin_audits_status ON linkedin_audits(status);

-- ============================================
-- 13. CERTIFICATES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS certificates (
    certificate_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ambassador_id UUID NOT NULL REFERENCES ambassadors(ambassador_id) ON DELETE CASCADE,
    course_type VARCHAR(100) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255),
    file_size BIGINT,
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(ambassador_id, course_type)
);

CREATE INDEX IF NOT EXISTS idx_certificates_ambassador_id ON certificates(ambassador_id);
CREATE INDEX IF NOT EXISTS idx_certificates_course_type ON certificates(course_type);
CREATE INDEX IF NOT EXISTS idx_certificates_verified ON certificates(verified);

-- ============================================
-- 14. JOURNEY_MONTHS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS journey_months (
    month_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    month_number INTEGER NOT NULL UNIQUE CHECK (month_number >= 1 AND month_number <= 12),
    month_name VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default journey months
INSERT INTO journey_months (month_number, month_name, description) VALUES
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
ON CONFLICT (month_number) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_journey_months_month_number ON journey_months(month_number);

-- ============================================
-- 15. JOURNEY_TASKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS journey_tasks (
    task_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_identifier VARCHAR(100) NOT NULL,
    month_id UUID NOT NULL REFERENCES journey_months(month_id) ON DELETE CASCADE,
    task_name VARCHAR(255) NOT NULL,
    task_description TEXT,
    is_critical BOOLEAN DEFAULT FALSE,
    estimated_time VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(task_identifier, month_id)
);

CREATE INDEX IF NOT EXISTS idx_journey_tasks_month_id ON journey_tasks(month_id);
CREATE INDEX IF NOT EXISTS idx_journey_tasks_task_identifier ON journey_tasks(task_identifier);
CREATE INDEX IF NOT EXISTS idx_journey_tasks_is_critical ON journey_tasks(is_critical);

-- ============================================
-- 16. AMBASSADOR_JOURNEY_PROGRESS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS ambassador_journey_progress (
    progress_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ambassador_id UUID NOT NULL REFERENCES ambassadors(ambassador_id) ON DELETE CASCADE,
    month_id UUID NOT NULL REFERENCES journey_months(month_id) ON DELETE CASCADE,
    current_month BOOLEAN DEFAULT FALSE,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(ambassador_id, month_id)
);

CREATE INDEX IF NOT EXISTS idx_ambassador_journey_progress_ambassador_id ON ambassador_journey_progress(ambassador_id);
CREATE INDEX IF NOT EXISTS idx_ambassador_journey_progress_month_id ON ambassador_journey_progress(month_id);
CREATE INDEX IF NOT EXISTS idx_ambassador_journey_progress_current_month ON ambassador_journey_progress(current_month);

-- ============================================
-- 17. AMBASSADOR_TASK_COMPLETION TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS ambassador_task_completion (
    completion_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ambassador_id UUID NOT NULL REFERENCES ambassadors(ambassador_id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES journey_tasks(task_id) ON DELETE CASCADE,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(ambassador_id, task_id)
);

CREATE INDEX IF NOT EXISTS idx_ambassador_task_completion_ambassador_id ON ambassador_task_completion(ambassador_id);
CREATE INDEX IF NOT EXISTS idx_ambassador_task_completion_task_id ON ambassador_task_completion(task_id);
CREATE INDEX IF NOT EXISTS idx_ambassador_task_completion_completed ON ambassador_task_completion(completed);

-- ============================================
-- 18. JOURNEY_PROGRESS TABLE (Legacy - for backward compatibility)
-- ============================================
CREATE TABLE IF NOT EXISTS journey_progress (
    ambassador_id UUID PRIMARY KEY REFERENCES ambassadors(ambassador_id) ON DELETE CASCADE,
    current_month INTEGER DEFAULT 1,
    completed_tasks JSONB DEFAULT '{}',
    start_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    month_start_dates JSONB DEFAULT '{}',
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_journey_progress_ambassador_id ON journey_progress(ambassador_id);

-- ============================================
-- 19. SUPPORT_FEEDBACK TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS support_feedback (
    feedback_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    ambassador_id UUID REFERENCES ambassadors(ambassador_id) ON DELETE SET NULL,
    role VARCHAR(20) NOT NULL,
    category VARCHAR(50),
    subject TEXT,
    message TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','closed')),
    screenshot_filename TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_support_feedback_user_id ON support_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_support_feedback_status ON support_feedback(status);

-- ============================================
-- POPULATE JOURNEY TASKS
-- ============================================
-- This section populates all journey tasks for months 1-12

-- Month 1 tasks
INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, estimated_time, created_at, updated_at)
SELECT 
  uuid_generate_v4(),
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
  uuid_generate_v4(),
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
  uuid_generate_v4(),
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
  uuid_generate_v4(),
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
  uuid_generate_v4(),
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

-- Month 2 tasks
INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, estimated_time, created_at, updated_at)
SELECT 
  uuid_generate_v4(),
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
  uuid_generate_v4(),
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
  uuid_generate_v4(),
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
  uuid_generate_v4(),
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

-- Month 3 tasks
INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, estimated_time, created_at, updated_at)
SELECT 
  uuid_generate_v4(),
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
  uuid_generate_v4(),
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
  uuid_generate_v4(),
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
  uuid_generate_v4(),
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

-- Month 4 tasks
INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, estimated_time, created_at, updated_at)
SELECT 
  uuid_generate_v4(),
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
  uuid_generate_v4(),
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
  uuid_generate_v4(),
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
  uuid_generate_v4(),
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

-- Month 5 tasks
INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, estimated_time, created_at, updated_at)
SELECT 
  uuid_generate_v4(),
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
  uuid_generate_v4(),
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
  uuid_generate_v4(),
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
  uuid_generate_v4(),
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

-- Month 6 tasks
INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, estimated_time, created_at, updated_at)
SELECT 
  uuid_generate_v4(),
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
  uuid_generate_v4(),
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
  uuid_generate_v4(),
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

-- Month 7 tasks
INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, estimated_time, created_at, updated_at)
SELECT 
  uuid_generate_v4(),
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
  uuid_generate_v4(),
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
  uuid_generate_v4(),
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

-- Month 8 tasks
INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, estimated_time, created_at, updated_at)
SELECT 
  uuid_generate_v4(),
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
  uuid_generate_v4(),
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
  uuid_generate_v4(),
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
  uuid_generate_v4(),
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

-- Month 9 tasks
INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, estimated_time, created_at, updated_at)
SELECT 
  uuid_generate_v4(),
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
  uuid_generate_v4(),
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

-- Month 10 tasks
INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, estimated_time, created_at, updated_at)
SELECT 
  uuid_generate_v4(),
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
  uuid_generate_v4(),
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
  uuid_generate_v4(),
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

-- Month 11 tasks
INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, estimated_time, created_at, updated_at)
SELECT 
  uuid_generate_v4(),
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
  uuid_generate_v4(),
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
  uuid_generate_v4(),
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

-- Month 12 tasks
INSERT INTO journey_tasks (task_id, task_identifier, month_id, task_name, task_description, is_critical, estimated_time, created_at, updated_at)
SELECT 
  uuid_generate_v4(),
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
  uuid_generate_v4(),
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
-- VERIFICATION QUERIES
-- ============================================
-- Run these queries to verify the schema was created correctly:

-- Count tables
-- SELECT COUNT(*) as table_count 
-- FROM information_schema.tables 
-- WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

-- Count journey tasks by month
-- SELECT 
--   jm.month_number,
--   jm.month_name,
--   COUNT(jt.task_id) as task_count
-- FROM journey_months jm
-- LEFT JOIN journey_tasks jt ON jm.month_id = jt.month_id
-- GROUP BY jm.month_number, jm.month_name
-- ORDER BY jm.month_number;

-- View all tables
-- SELECT table_name 
-- FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- ORDER BY table_name;

-- ============================================
-- 20. IMPACT_ENTRIES TABLE (Individual impact logs)
-- ============================================
CREATE TABLE IF NOT EXISTS impact_entries (
    entry_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    user_role VARCHAR(20) NOT NULL CHECK (user_role IN ('ambassador', 'partner', 'user')),
    entry_type VARCHAR(20) NOT NULL DEFAULT 'individual' CHECK (entry_type IN ('individual', 'event_master', 'event_derived')),
    event_id UUID,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    esg_category VARCHAR(20) NOT NULL CHECK (esg_category IN ('environmental', 'social', 'governance')),
    people_impacted INTEGER DEFAULT 0,
    hours_contributed NUMERIC(10,2) DEFAULT 0,
    usd_value NUMERIC(12,2) DEFAULT 0,
    impact_unit VARCHAR(50) DEFAULT 'people',
    scp_earned NUMERIC(10,2) DEFAULT 0,
    points_earned INTEGER DEFAULT 0,
    points_month VARCHAR(7),
    verification_level VARCHAR(10) DEFAULT 'tier_1' CHECK (verification_level IN ('tier_1', 'tier_2', 'tier_3', 'tier_4')),
    verification_multiplier NUMERIC(3,1) DEFAULT 1.0,
    evidence_url TEXT,
    external_verifier_email VARCHAR(255),
    activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
    share_externally BOOLEAN DEFAULT FALSE,
    is_past_dated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_impact_entries_user_id ON impact_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_impact_entries_esg_category ON impact_entries(esg_category);
CREATE INDEX IF NOT EXISTS idx_impact_entries_created_at ON impact_entries(created_at DESC);

-- ============================================
-- 21. IMPACT_EVENTS TABLE (Shared Impact Events)
-- ============================================
CREATE TABLE IF NOT EXISTS impact_events (
    event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_by UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    creator_role VARCHAR(20) NOT NULL CHECK (creator_role IN ('ambassador', 'partner', 'admin')),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    esg_category VARCHAR(20) NOT NULL CHECK (esg_category IN ('environmental', 'social', 'governance')),
    total_impact_value INTEGER NOT NULL DEFAULT 0,
    impact_unit VARCHAR(50) NOT NULL DEFAULT 'people',
    event_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status VARCHAR(10) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    verification_level VARCHAR(10) DEFAULT 'tier_2',
    verification_multiplier NUMERIC(3,1) DEFAULT 1.5,
    expected_participants INTEGER,
    evidence_url TEXT,
    external_verifier_email VARCHAR(255),
    public_slug VARCHAR(20) NOT NULL UNIQUE,
    actual_participants INTEGER DEFAULT 0,
    per_participant_impact NUMERIC(12,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_impact_events_created_by ON impact_events(created_by);
CREATE INDEX IF NOT EXISTS idx_impact_events_status ON impact_events(status);
CREATE INDEX IF NOT EXISTS idx_impact_events_public_slug ON impact_events(public_slug);

-- ============================================
-- 22. EVENT_PARTICIPANTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS event_participants (
    participant_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES impact_events(event_id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    participant_type VARCHAR(10) NOT NULL DEFAULT 'user' CHECK (participant_type IN ('user', 'anonymous')),
    anonymous_hash VARCHAR(64),
    display_name VARCHAR(100),
    impact_share NUMERIC(12,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_event_participants_event_id ON event_participants(event_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_participants_unique_user ON event_participants(event_id, user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_participants_unique_anon ON event_participants(event_id, anonymous_hash) WHERE anonymous_hash IS NOT NULL;

-- Add foreign key from impact_entries to impact_events
ALTER TABLE impact_entries ADD CONSTRAINT fk_impact_entries_event FOREIGN KEY (event_id) REFERENCES impact_events(event_id) ON DELETE CASCADE;

-- ============================================
-- END OF SCHEMA
-- ============================================
