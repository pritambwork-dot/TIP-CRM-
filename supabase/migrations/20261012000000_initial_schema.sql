-- ==============================================================================
-- TIP CRM — Master Production Database Deployment & Migration Script
-- Version: 2.0.0 (Consolidated, Idempotent, Dependency-Safe, Production-Hardened)
-- Target: PostgreSQL 15+ / Supabase (Standard & Enterprise Editions)
-- Architecture: 4-Level RBAC + Grounded AI + Private Storage + Strict Data-Level RLS
-- Security Standard: OWASP Top 10 / SOC 2 Least Privilege / Zero Leaked Secrets
-- Notice: Safe for execution on fresh projects or existing partially-migrated databases.
-- ==============================================================================

BEGIN;

-- ==============================================================================
-- 1. EXTENSIONS
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. ENUMS & DOMAIN TYPES (Idempotent Creation)
-- ==============================================================================

DO $$ BEGIN
  CREATE TYPE user_role_level AS ENUM ('super_admin', 'staff_manager', 'staff_member', 'volunteer');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE user_account_status AS ENUM ('pending', 'approved', 'rejected', 'suspended', 'disabled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE data_scope_type AS ENUM ('ALL', 'GLOBAL', 'ORGANIZATION', 'PROGRAM', 'EVENT', 'ASSIGNED', 'OWN_RECORD', 'SCOPED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE relationship_type AS ENUM (
    'Partner', 'Funder / Donor', 'Participant', 'Volunteer', 
    'Advisor', 'Facilitator', 'Stakeholder', 'Other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE organization_type AS ENUM (
    'Partner', 'Funder', 'Community Organization', 'Institution', 
    'Company', 'Government Organization', 'University', 'Other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE program_status AS ENUM ('Planning', 'Active', 'On Hold', 'Completed', 'Archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE event_type AS ENUM ('Workshop', 'Consultation', 'Community Forum', 'Training', 'Panel', 'Youth Lab');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE participant_status AS ENUM ('Registered', 'Attended', 'Did not attend', 'Completed', 'Waitlisted', 'Withdrawn');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE task_priority AS ENUM ('Low', 'Medium', 'High');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE task_status AS ENUM ('To Do', 'In Progress', 'Completed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE interaction_type AS ENUM ('Email', 'Meeting', 'Call', 'Workshop', 'Note', 'Follow-up');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE funding_status AS ENUM ('Received', 'Pledged', 'Pending Review', 'Approved', 'Applied', 'Prospective');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE analysis_job_status AS ENUM ('queued', 'processing', 'completed', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE analysis_insight_type AS ENUM ('finding', 'trend', 'anomaly', 'opportunity', 'risk', 'recommendation', 'caveat');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ==============================================================================
-- 3. IDENTITY, MULTI-TENANCY & RBAC TABLES (Tables 1 - 9)
-- ==============================================================================

-- 1. Organizations (Multi-tenant root boundary)
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  type organization_type DEFAULT 'Partner',
  sector VARCHAR(100),
  website VARCHAR(255),
  phone VARCHAR(50),
  email VARCHAR(255),
  city VARCHAR(100),
  province VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. System & Organization Roles
CREATE TABLE IF NOT EXISTS public.roles (
  id VARCHAR(50) PRIMARY KEY, -- 'super_admin', 'staff_manager', 'staff_member', 'volunteer'
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_system_role BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Granular Permissions (Resource + Action)
CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resource VARCHAR(50) NOT NULL, -- e.g. 'people', 'programs', 'funding', 'users'
  action VARCHAR(50) NOT NULL,   -- e.g. 'view', 'create', 'edit', 'delete', 'manage'
  description TEXT,
  CONSTRAINT uq_resource_action UNIQUE (resource, action)
);

-- 4. Role Permissions Mapping
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_id VARCHAR(50) REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES public.permissions(id) ON DELETE CASCADE,
  CONSTRAINT uq_role_permission UNIQUE (role_id, permission_id)
);

-- 5. Application Users (Linked to Supabase Auth via auth_user_id)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id VARCHAR(100) UNIQUE, -- references authenticated Supabase Auth user ID
  organization_id UUID REFERENCES public.organizations(id) ON DELETE RESTRICT,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  avatar_url TEXT,
  phone VARCHAR(50),
  title VARCHAR(150),
  status user_account_status DEFAULT 'pending',
  is_active BOOLEAN DEFAULT FALSE,
  approved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  people_scope data_scope_type DEFAULT 'ASSIGNED',
  programs_scope data_scope_type DEFAULT 'ASSIGNED',
  events_scope data_scope_type DEFAULT 'ASSIGNED',
  funding_scope VARCHAR(20) DEFAULT 'NONE', -- 'ALL', 'VIEW', 'NONE'
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. User Roles Mapping (Supports Primary and Secondary Role Assignments)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  role_id VARCHAR(50) REFERENCES public.roles(id) ON DELETE RESTRICT,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_user_role UNIQUE (user_id, role_id)
);

-- 7. Self-Service Access Requests (Google OAuth & Staff Onboarding)
CREATE TABLE IF NOT EXISTS public.access_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  provider VARCHAR(50) DEFAULT 'google',
  status user_account_status DEFAULT 'pending',
  notes TEXT,
  rejection_reason TEXT,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ
);

-- 8. User Program Scoping Access (Data-level assignment)
CREATE TABLE IF NOT EXISTS public.user_program_access (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  program_id UUID NOT NULL,
  granted_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_user_program UNIQUE (user_id, program_id)
);

-- 9. User Event Scoping Access (Data-level assignment)
CREATE TABLE IF NOT EXISTS public.user_event_access (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  event_id UUID NOT NULL,
  granted_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_user_event UNIQUE (user_id, event_id)
);

-- ==============================================================================
-- 4. CORE CRM DOMAIN TABLES (Tables 10 - 16)
-- ==============================================================================

-- 10. People (Contacts Directory)
CREATE TABLE IF NOT EXISTS public.people (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  role_title VARCHAR(150),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  relationship_types relationship_type[] DEFAULT ARRAY['Participant']::relationship_type[],
  city VARCHAR(100),
  province VARCHAR(100),
  notes TEXT,
  mailchimp_status VARCHAR(50) DEFAULT 'pending',
  last_interaction_date DATE,
  next_follow_up_date DATE,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Programs & Community Cohorts
CREATE TABLE IF NOT EXISTS public.programs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status program_status DEFAULT 'Active',
  start_date DATE,
  end_date DATE,
  owner_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  budget_cad NUMERIC(12, 2) DEFAULT 0.00,
  outcomes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Program Members (Staff & Coordinator assignments to programs)
CREATE TABLE IF NOT EXISTS public.program_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'Member',
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_program_user UNIQUE (program_id, user_id)
);

-- 13. Program Participants (People enrolled in programs/cohorts)
CREATE TABLE IF NOT EXISTS public.program_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE,
  person_id UUID REFERENCES public.people(id) ON DELETE CASCADE,
  status participant_status DEFAULT 'Registered',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_program_person UNIQUE (program_id, person_id)
);

-- 14. Events & Workshops
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  program_id UUID REFERENCES public.programs(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  event_type event_type DEFAULT 'Workshop',
  date DATE NOT NULL,
  time VARCHAR(50),
  location VARCHAR(255),
  is_online BOOLEAN DEFAULT FALSE,
  meeting_link VARCHAR(255),
  capacity INT DEFAULT 50,
  facilitator_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  description TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. Event Staff Assignments
CREATE TABLE IF NOT EXISTS public.event_staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'Facilitator',
  CONSTRAINT uq_event_user UNIQUE (event_id, user_id)
);

-- 16. Event Participants & Attendance Records
CREATE TABLE IF NOT EXISTS public.event_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  person_id UUID REFERENCES public.people(id) ON DELETE CASCADE,
  registration_status participant_status DEFAULT 'Registered',
  attendance_status participant_status DEFAULT 'Registered',
  attended_at TIMESTAMPTZ,
  notes TEXT,
  CONSTRAINT uq_event_person UNIQUE (event_id, person_id)
);

-- ==============================================================================
-- 5. WORK & OPERATIONS DOMAIN TABLES (Tables 17 - 18)
-- ==============================================================================

-- 17. Tasks & Milestone Tracking
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  related_person_id UUID REFERENCES public.people(id) ON DELETE SET NULL,
  related_program_id UUID REFERENCES public.programs(id) ON DELETE SET NULL,
  related_event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  due_date DATE,
  priority task_priority DEFAULT 'Medium',
  status task_status DEFAULT 'To Do',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 18. Interactions & Touchpoint History
CREATE TABLE IF NOT EXISTS public.interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  person_id UUID REFERENCES public.people(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  type interaction_type NOT NULL,
  summary VARCHAR(255) NOT NULL,
  details TEXT,
  interaction_date DATE NOT NULL,
  follow_up_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 6. FUNDING & FIDUCIARY DOMAIN (Table 19)
-- ==============================================================================

-- 19. Funding Records (Grants, Donations, Sponsorships)
CREATE TABLE IF NOT EXISTS public.funding_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  donor_or_funder VARCHAR(255) NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  program_id UUID REFERENCES public.programs(id) ON DELETE SET NULL,
  amount_cad NUMERIC(12, 2) NOT NULL,
  date DATE NOT NULL,
  funding_type VARCHAR(100) NOT NULL,
  status funding_status DEFAULT 'Received',
  report_due_date DATE,
  fiscal_year VARCHAR(20),
  grant_deliverable_note TEXT,
  notes TEXT,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 7. DOCUMENTS & AUDIT TRAIL DOMAIN (Tables 20 - 21)
-- ==============================================================================

-- 20. Documents & Cloud Attachments
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  url TEXT NOT NULL,
  related_type VARCHAR(50),
  related_id UUID,
  description TEXT,
  added_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  storage_path VARCHAR(500),
  storage_bucket VARCHAR(100) DEFAULT 'tip-crm-private-documents',
  file_size BIGINT,
  mime_type VARCHAR(100),
  is_confidential BOOLEAN DEFAULT FALSE,
  access_tier VARCHAR(50) DEFAULT 'all', -- 'all', 'staff', 'management', 'super_admin'
  checksum VARCHAR(64),
  is_direct_upload BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure storage metadata columns exist if table was previously created
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS storage_path VARCHAR(500),
  ADD COLUMN IF NOT EXISTS storage_bucket VARCHAR(100) DEFAULT 'tip-crm-private-documents',
  ADD COLUMN IF NOT EXISTS file_size BIGINT,
  ADD COLUMN IF NOT EXISTS mime_type VARCHAR(100),
  ADD COLUMN IF NOT EXISTS is_confidential BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS access_tier VARCHAR(50) DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS checksum VARCHAR(64),
  ADD COLUMN IF NOT EXISTS is_direct_upload BOOLEAN DEFAULT FALSE;

-- 21. Immutable Security Audit Trail
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id VARCHAR(100) NOT NULL,
  actor_name VARCHAR(255) NOT NULL,
  actor_role VARCHAR(100) NOT NULL,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100) NOT NULL,
  resource_id VARCHAR(100),
  entity_name VARCHAR(255),
  outcome VARCHAR(20) NOT NULL DEFAULT 'SUCCESS' CHECK (outcome IN ('SUCCESS', 'FAILURE')),
  description TEXT NOT NULL,
  correlation_id VARCHAR(100),
  metadata JSONB,
  ip_address VARCHAR(100),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 8. GROUNDED AI & CSV ANALYTICS DOMAIN (Tables 22 - 28)
-- ==============================================================================

-- 22. Uploaded Analysis Files
CREATE TABLE IF NOT EXISTS public.analysis_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  file_type VARCHAR(50) DEFAULT 'text/csv',
  file_size BIGINT NOT NULL,
  row_count INTEGER NOT NULL,
  column_count INTEGER NOT NULL,
  checksum VARCHAR(64) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 23. Analytics Processing Jobs
CREATE TABLE IF NOT EXISTS public.analysis_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  file_id UUID NOT NULL REFERENCES public.analysis_files(id) ON DELETE CASCADE,
  status analysis_job_status DEFAULT 'queued',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 24. Deterministic Analysis Results
CREATE TABLE IF NOT EXISTS public.analysis_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  analysis_job_id UUID NOT NULL REFERENCES public.analysis_jobs(id) ON DELETE CASCADE,
  summary TEXT,
  data_quality_summary JSONB NOT NULL,
  calculation_version VARCHAR(50) DEFAULT 'tip-math-v1.0',
  ai_model VARCHAR(100) DEFAULT 'gemini-2.5-flash',
  ai_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 25. Computed Analytical Metrics
CREATE TABLE IF NOT EXISTS public.analysis_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  analysis_result_id UUID NOT NULL REFERENCES public.analysis_results(id) ON DELETE CASCADE,
  metric_name VARCHAR(100) NOT NULL,
  metric_value NUMERIC NOT NULL,
  metric_type VARCHAR(50) NOT NULL,
  dimensions JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 26. Grounded AI Insights (Observed / Interpretation / Action)
CREATE TABLE IF NOT EXISTS public.analysis_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  analysis_result_id UUID NOT NULL REFERENCES public.analysis_results(id) ON DELETE CASCADE,
  insight_type analysis_insight_type NOT NULL,
  category VARCHAR(50) DEFAULT 'observed',
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  supporting_metrics JSONB,
  recommendation TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 27. AI Request Telemetry & Token Accounting
CREATE TABLE IF NOT EXISTS public.ai_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  feature VARCHAR(100) NOT NULL,
  request_timestamp TIMESTAMPTZ DEFAULT NOW(),
  model VARCHAR(100) DEFAULT 'gemini-2.5-flash',
  input_token_estimate INTEGER DEFAULT 0,
  output_token_estimate INTEGER DEFAULT 0,
  latency_ms INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'success'
);

-- 28. Monthly AI Usage Aggregations
CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  period VARCHAR(7) NOT NULL, -- Format: YYYY-MM
  total_requests INTEGER DEFAULT 0,
  csv_analyses INTEGER DEFAULT 0,
  data_questions INTEGER DEFAULT 0,
  report_generations INTEGER DEFAULT 0,
  token_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_ai_usage_org_period UNIQUE (organization_id, period)
);

-- ==============================================================================
-- 9. PERFORMANCE & FOREIGN KEY INDEXES (All Idempotent)
-- ==============================================================================

-- Identity & RBAC
CREATE INDEX IF NOT EXISTS idx_users_organization_id ON public.users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON public.users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_users_status_active ON public.users(status, is_active);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON public.user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_access_requests_auth_user_id ON public.access_requests(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_access_requests_email ON public.access_requests(email);
CREATE INDEX IF NOT EXISTS idx_access_requests_status ON public.access_requests(status);
CREATE INDEX IF NOT EXISTS idx_user_prog_access_user ON public.user_program_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_prog_access_prog ON public.user_program_access(program_id);
CREATE INDEX IF NOT EXISTS idx_user_event_access_user ON public.user_event_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_event_access_event ON public.user_event_access(event_id);

-- Core CRM
CREATE INDEX IF NOT EXISTS idx_people_organization_id ON public.people(organization_id);
CREATE INDEX IF NOT EXISTS idx_people_created_by ON public.people(created_by);
CREATE INDEX IF NOT EXISTS idx_people_email ON public.people(email);
CREATE INDEX IF NOT EXISTS idx_programs_owner_id ON public.programs(owner_id);
CREATE INDEX IF NOT EXISTS idx_programs_status ON public.programs(status);
CREATE INDEX IF NOT EXISTS idx_program_members_user ON public.program_members(user_id);
CREATE INDEX IF NOT EXISTS idx_program_participants_person ON public.program_participants(person_id);
CREATE INDEX IF NOT EXISTS idx_events_program_id ON public.events(program_id);
CREATE INDEX IF NOT EXISTS idx_events_facilitator_id ON public.events(facilitator_id);
CREATE INDEX IF NOT EXISTS idx_events_date ON public.events(date);
CREATE INDEX IF NOT EXISTS idx_event_staff_user ON public.event_staff(user_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_person ON public.event_participants(person_id);

-- Operations & Tasks
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON public.tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_status_due ON public.tasks(status, due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_related_person ON public.tasks(related_person_id);
CREATE INDEX IF NOT EXISTS idx_tasks_related_program ON public.tasks(related_program_id);
CREATE INDEX IF NOT EXISTS idx_tasks_related_event ON public.tasks(related_event_id);
CREATE INDEX IF NOT EXISTS idx_interactions_person_id ON public.interactions(person_id);
CREATE INDEX IF NOT EXISTS idx_interactions_org_id ON public.interactions(organization_id);
CREATE INDEX IF NOT EXISTS idx_interactions_user_id ON public.interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_interactions_date ON public.interactions(interaction_date);

-- Fiduciary & Funding
CREATE INDEX IF NOT EXISTS idx_funding_organization_id ON public.funding_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_funding_program_id ON public.funding_records(program_id);
CREATE INDEX IF NOT EXISTS idx_funding_created_by ON public.funding_records(created_by);
CREATE INDEX IF NOT EXISTS idx_funding_date ON public.funding_records(date);
CREATE INDEX IF NOT EXISTS idx_funding_status ON public.funding_records(status);

-- Documents & Audit Logs
CREATE INDEX IF NOT EXISTS idx_documents_added_by ON public.documents(added_by);
CREATE INDEX IF NOT EXISTS idx_documents_related ON public.documents(related_type, related_id);
CREATE INDEX IF NOT EXISTS idx_documents_storage_path ON public.documents(storage_path);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON public.audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_outcome ON public.audit_logs(outcome);
CREATE INDEX IF NOT EXISTS idx_audit_logs_correlation_id ON public.audit_logs(correlation_id);

-- AI Intelligence
CREATE INDEX IF NOT EXISTS idx_analysis_files_org_user ON public.analysis_files(organization_id, uploaded_by);
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_org_status ON public.analysis_jobs(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_analysis_results_job_id ON public.analysis_results(analysis_job_id);
CREATE INDEX IF NOT EXISTS idx_analysis_metrics_result_id ON public.analysis_metrics(analysis_result_id);
CREATE INDEX IF NOT EXISTS idx_analysis_insights_result_id ON public.analysis_insights(analysis_result_id);
CREATE INDEX IF NOT EXISTS idx_ai_requests_org_user ON public.ai_requests(organization_id, user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_org_period ON public.ai_usage_logs(organization_id, period);

-- ==============================================================================
-- 10. DATABASE TRIGGERS & INTEGRITY ENFORCEMENT
-- ==============================================================================

-- Trigger 1: Audit Log Immutability (Strictly prevents UPDATE and DELETE)
CREATE OR REPLACE FUNCTION public.prevent_audit_log_modification()
RETURNS TRIGGER 
LANGUAGE plpgsql 
AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs are strictly immutable: UPDATE and DELETE operations are forbidden.';
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_logs_immutable ON public.audit_logs;
CREATE TRIGGER trg_audit_logs_immutable
BEFORE UPDATE OR DELETE ON public.audit_logs
FOR EACH ROW
EXECUTE FUNCTION public.prevent_audit_log_modification();

-- Trigger 2: Self-Elevation & Privilege Escalation Prevention on public.users
CREATE OR REPLACE FUNCTION public.check_users_self_elevation()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Super Admin or Supabase internal service_role can perform administrative updates
  IF (SELECT public.is_super_admin()) OR auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Protect privileged authorization columns from modification by regular users
  IF NEW.status IS DISTINCT FROM OLD.status OR
     NEW.is_active IS DISTINCT FROM OLD.is_active OR
     NEW.approved_by IS DISTINCT FROM OLD.approved_by OR
     NEW.approved_at IS DISTINCT FROM OLD.approved_at OR
     NEW.organization_id IS DISTINCT FROM OLD.organization_id OR
     NEW.people_scope IS DISTINCT FROM OLD.people_scope OR
     NEW.programs_scope IS DISTINCT FROM OLD.programs_scope OR
     NEW.events_scope IS DISTINCT FROM OLD.events_scope OR
     NEW.funding_scope IS DISTINCT FROM OLD.funding_scope OR
     NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id THEN
    RAISE EXCEPTION 'Security violation: Users cannot modify their own status, active state, data scopes, or organization.';
  END IF;

  RETURN NEW;
END;
$$;

-- Note: We will attach trg_prevent_self_elevation_users after is_super_admin() is created below.

-- ==============================================================================
-- 11. TRUSTED SECURITY DEFINER HELPER FUNCTIONS (Optimized Subqueries & Fixed search_path)
-- ==============================================================================

-- Helper 1: Verify authenticated active approved user status
CREATE OR REPLACE FUNCTION public.user_has_crm_access() 
RETURNS BOOLEAN 
LANGUAGE sql 
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users 
    WHERE auth_user_id = (SELECT auth.uid())::text 
      AND status = 'approved' 
      AND is_active = TRUE
  );
$$;

-- Helper 2: Extract current CRM user's primary internal UUID
CREATE OR REPLACE FUNCTION public.current_user_id() 
RETURNS UUID 
LANGUAGE sql 
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT id FROM public.users 
  WHERE auth_user_id = (SELECT auth.uid())::text 
    AND status = 'approved' 
    AND is_active = TRUE 
  LIMIT 1;
$$;

-- Helper 3: Extract current CRM user's organization UUID
CREATE OR REPLACE FUNCTION public.current_user_org_id() 
RETURNS UUID 
LANGUAGE sql 
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT organization_id FROM public.users 
  WHERE auth_user_id = (SELECT auth.uid())::text 
    AND status = 'approved' 
    AND is_active = TRUE 
  LIMIT 1;
$$;

-- Helper 4: Super Admin Gate (Database-Verified)
CREATE OR REPLACE FUNCTION public.is_super_admin() 
RETURNS BOOLEAN 
LANGUAGE sql 
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.user_roles ur ON ur.user_id = u.id
    WHERE u.auth_user_id = (SELECT auth.uid())::text 
      AND ur.role_id = 'super_admin'
      AND u.status = 'approved' 
      AND u.is_active = TRUE
  );
$$;

-- Helper 5: Staff Manager or Higher Gate (Levels 1 & 2)
CREATE OR REPLACE FUNCTION public.is_staff_manager_or_higher() 
RETURNS BOOLEAN 
LANGUAGE sql 
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.user_roles ur ON ur.user_id = u.id
    WHERE u.auth_user_id = (SELECT auth.uid())::text 
      AND ur.role_id IN ('super_admin', 'staff_manager')
      AND u.status = 'approved' 
      AND u.is_active = TRUE
  );
$$;

-- Helper 6: Staff Member or Higher Gate (Levels 1, 2, & 3 - Excludes Volunteers)
CREATE OR REPLACE FUNCTION public.is_staff_member_or_higher() 
RETURNS BOOLEAN 
LANGUAGE sql 
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.user_roles ur ON ur.user_id = u.id
    WHERE u.auth_user_id = (SELECT auth.uid())::text 
      AND ur.role_id IN ('super_admin', 'staff_manager', 'staff_member')
      AND u.status = 'approved' 
      AND u.is_active = TRUE
  );
$$;

-- Helper 7: User identity helper for application contexts
CREATE OR REPLACE FUNCTION public.get_current_app_user() 
RETURNS TABLE (
  user_id UUID,
  role_id VARCHAR,
  org_id UUID,
  is_approved BOOLEAN,
  is_active_user BOOLEAN
) 
LANGUAGE sql 
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT 
    id AS user_id, 
    (SELECT role_id FROM public.user_roles WHERE user_id = users.id LIMIT 1) AS role_id,
    organization_id AS org_id,
    (status = 'approved') AS is_approved,
    is_active AS is_active_user
  FROM public.users 
  WHERE auth_user_id = (SELECT auth.uid())::text;
$$;

-- Attach Anti-Elevation Trigger now that is_super_admin() is compiled
DROP TRIGGER IF EXISTS trg_prevent_self_elevation_users ON public.users;
CREATE TRIGGER trg_prevent_self_elevation_users
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.check_users_self_elevation();

-- Controlled Retention Procedure for Audit Logs (Super Admin ONLY)
CREATE OR REPLACE FUNCTION public.purge_audit_logs_older_than(days_to_keep INTEGER)
RETURNS INTEGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  IF NOT (SELECT public.is_super_admin()) THEN
    RAISE EXCEPTION 'Unauthorized: Only Super Administrators can execute audit log retention archiving.';
  END IF;

  ALTER TABLE public.audit_logs DISABLE TRIGGER trg_audit_logs_immutable;
  
  DELETE FROM public.audit_logs 
  WHERE timestamp < (NOW() - (days_to_keep || ' days')::INTERVAL);
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  ALTER TABLE public.audit_logs ENABLE TRIGGER trg_audit_logs_immutable;
  RETURN deleted_count;
END;
$$;

-- ==============================================================================
-- 12. ENABLE ROW LEVEL SECURITY ACROSS ALL CRM & STORAGE TABLES (28 TABLES + STORAGE)
-- ==============================================================================

ALTER TABLE IF EXISTS public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.access_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_program_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_event_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.people ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.program_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.program_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.event_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.funding_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.analysis_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.analysis_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.analysis_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.analysis_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ai_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'objects') THEN
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
  END IF;
EXCEPTION
  WHEN insufficient_privilege THEN NULL;
END $$;

-- ==============================================================================
-- 13. GRANULAR, LEAST-PRIVILEGE ROW LEVEL SECURITY POLICIES
-- ==============================================================================

-- --- 13.1 ROLES, PERMISSIONS, ROLE_PERMISSIONS ---
DROP POLICY IF EXISTS roles_read_crm ON public.roles;
CREATE POLICY roles_read_crm ON public.roles FOR SELECT USING ((SELECT public.user_has_crm_access()));
DROP POLICY IF EXISTS roles_write_super_admin ON public.roles;
CREATE POLICY roles_write_super_admin ON public.roles FOR ALL USING ((SELECT public.is_super_admin())) WITH CHECK ((SELECT public.is_super_admin()));

DROP POLICY IF EXISTS permissions_read_crm ON public.permissions;
CREATE POLICY permissions_read_crm ON public.permissions FOR SELECT USING ((SELECT public.user_has_crm_access()));
DROP POLICY IF EXISTS permissions_write_super_admin ON public.permissions;
CREATE POLICY permissions_write_super_admin ON public.permissions FOR ALL USING ((SELECT public.is_super_admin())) WITH CHECK ((SELECT public.is_super_admin()));

DROP POLICY IF EXISTS role_permissions_read_crm ON public.role_permissions;
CREATE POLICY role_permissions_read_crm ON public.role_permissions FOR SELECT USING ((SELECT public.user_has_crm_access()));
DROP POLICY IF EXISTS role_permissions_write_super_admin ON public.role_permissions;
CREATE POLICY role_permissions_write_super_admin ON public.role_permissions FOR ALL USING ((SELECT public.is_super_admin())) WITH CHECK ((SELECT public.is_super_admin()));

-- --- 13.2 USER ROLES (Blocks self-promotion) ---
DROP POLICY IF EXISTS user_roles_read_authorized ON public.user_roles;
CREATE POLICY user_roles_read_authorized ON public.user_roles FOR SELECT USING (
  (SELECT public.is_super_admin()) OR 
  user_id = (SELECT public.current_user_id()) OR 
  ((SELECT public.user_has_crm_access()) AND user_id IN (SELECT id FROM public.users WHERE organization_id = (SELECT public.current_user_org_id())))
);
DROP POLICY IF EXISTS user_roles_write_super_admin ON public.user_roles;
CREATE POLICY user_roles_write_super_admin ON public.user_roles FOR ALL USING ((SELECT public.is_super_admin())) WITH CHECK ((SELECT public.is_super_admin()));

-- --- 13.3 USERS ---
DROP POLICY IF EXISTS super_admin_all_users ON public.users;
CREATE POLICY super_admin_all_users ON public.users FOR ALL USING ((SELECT public.is_super_admin())) WITH CHECK ((SELECT public.is_super_admin()));
DROP POLICY IF EXISTS org_users_view ON public.users;
CREATE POLICY org_users_view ON public.users FOR SELECT USING (
  (SELECT public.user_has_crm_access()) AND organization_id = (SELECT public.current_user_org_id())
);
DROP POLICY IF EXISTS users_self_update ON public.users;
CREATE POLICY users_self_update ON public.users FOR UPDATE USING (
  auth_user_id = (SELECT auth.uid())::text AND (SELECT public.user_has_crm_access())
) WITH CHECK (
  auth_user_id = (SELECT auth.uid())::text
);

-- --- 13.4 ACCESS REQUESTS ---
DROP POLICY IF EXISTS super_admin_access_requests ON public.access_requests;
CREATE POLICY super_admin_access_requests ON public.access_requests FOR ALL USING ((SELECT public.is_super_admin())) WITH CHECK ((SELECT public.is_super_admin()));
DROP POLICY IF EXISTS own_access_request ON public.access_requests;
CREATE POLICY own_access_request ON public.access_requests FOR SELECT USING (auth_user_id = (SELECT auth.uid())::text);
DROP POLICY IF EXISTS insert_access_request ON public.access_requests;
CREATE POLICY insert_access_request ON public.access_requests FOR INSERT WITH CHECK (auth_user_id = (SELECT auth.uid())::text);

-- --- 13.5 ORGANIZATIONS ---
DROP POLICY IF EXISTS organizations_super_admin ON public.organizations;
CREATE POLICY organizations_super_admin ON public.organizations FOR ALL USING ((SELECT public.is_super_admin())) WITH CHECK ((SELECT public.is_super_admin()));
DROP POLICY IF EXISTS organizations_read_crm ON public.organizations;
CREATE POLICY organizations_read_crm ON public.organizations FOR SELECT USING ((SELECT public.user_has_crm_access()));
DROP POLICY IF EXISTS organizations_update_manager ON public.organizations;
CREATE POLICY organizations_update_manager ON public.organizations FOR UPDATE USING (
  (SELECT public.is_staff_manager_or_higher()) AND id = (SELECT public.current_user_org_id())
) WITH CHECK (
  id = (SELECT public.current_user_org_id())
);

-- --- 13.6 PEOPLE (Contacts Directory) ---
DROP POLICY IF EXISTS super_admin_all_people ON public.people;
CREATE POLICY super_admin_all_people ON public.people FOR ALL USING ((SELECT public.is_super_admin())) WITH CHECK ((SELECT public.is_super_admin()));
DROP POLICY IF EXISTS people_read_scoped ON public.people;
CREATE POLICY people_read_scoped ON public.people FOR SELECT USING (
  (SELECT public.user_has_crm_access()) AND (
    (SELECT public.is_staff_manager_or_higher()) OR 
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = (SELECT public.current_user_id()) AND u.people_scope = 'GLOBAL') OR
    organization_id = (SELECT public.current_user_org_id()) OR
    id IN (
      SELECT person_id FROM public.program_participants WHERE program_id IN (SELECT program_id FROM public.user_program_access WHERE user_id = (SELECT public.current_user_id()))
      UNION
      SELECT person_id FROM public.event_participants WHERE event_id IN (SELECT event_id FROM public.user_event_access WHERE user_id = (SELECT public.current_user_id()))
    ) OR
    created_by = (SELECT public.current_user_id())
  )
);
DROP POLICY IF EXISTS people_insert_staff ON public.people;
CREATE POLICY people_insert_staff ON public.people FOR INSERT WITH CHECK (
  (SELECT public.is_staff_member_or_higher()) AND (organization_id IS NULL OR organization_id = (SELECT public.current_user_org_id()))
);
DROP POLICY IF EXISTS people_update_staff ON public.people;
CREATE POLICY people_update_staff ON public.people FOR UPDATE USING (
  (SELECT public.is_staff_member_or_higher()) AND (organization_id IS NULL OR organization_id = (SELECT public.current_user_org_id()))
) WITH CHECK (
  organization_id IS NULL OR organization_id = (SELECT public.current_user_org_id())
);
DROP POLICY IF EXISTS people_delete_manager ON public.people;
CREATE POLICY people_delete_manager ON public.people FOR DELETE USING (
  (SELECT public.is_staff_manager_or_higher()) AND (organization_id IS NULL OR organization_id = (SELECT public.current_user_org_id()))
);

-- --- 13.7 PROGRAMS & PROGRAM MEMBERS/PARTICIPANTS ---
DROP POLICY IF EXISTS super_admin_all_programs ON public.programs;
CREATE POLICY super_admin_all_programs ON public.programs FOR ALL USING ((SELECT public.is_super_admin())) WITH CHECK ((SELECT public.is_super_admin()));
DROP POLICY IF EXISTS programs_scoped_view ON public.programs;
CREATE POLICY programs_scoped_view ON public.programs FOR SELECT USING (
  (SELECT public.user_has_crm_access()) AND (
    (SELECT public.is_staff_manager_or_higher()) OR 
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = (SELECT public.current_user_id()) AND u.programs_scope = 'ALL') OR
    id IN (SELECT program_id FROM public.user_program_access WHERE user_id = (SELECT public.current_user_id())) OR
    id IN (SELECT program_id FROM public.program_members WHERE user_id = (SELECT public.current_user_id()))
  )
);
DROP POLICY IF EXISTS programs_insert_manager ON public.programs;
CREATE POLICY programs_insert_manager ON public.programs FOR INSERT WITH CHECK ((SELECT public.is_staff_manager_or_higher()));
DROP POLICY IF EXISTS programs_update_manager ON public.programs;
CREATE POLICY programs_update_manager ON public.programs FOR UPDATE USING (
  (SELECT public.is_staff_manager_or_higher()) OR owner_id = (SELECT public.current_user_id())
) WITH CHECK (
  (SELECT public.is_staff_manager_or_higher()) OR owner_id = (SELECT public.current_user_id())
);
DROP POLICY IF EXISTS programs_delete_super_admin ON public.programs;
CREATE POLICY programs_delete_super_admin ON public.programs FOR DELETE USING ((SELECT public.is_super_admin()));

DROP POLICY IF EXISTS program_members_read ON public.program_members;
CREATE POLICY program_members_read ON public.program_members FOR SELECT USING ((SELECT public.user_has_crm_access()));
DROP POLICY IF EXISTS program_members_write_manager ON public.program_members;
CREATE POLICY program_members_write_manager ON public.program_members FOR ALL USING ((SELECT public.is_staff_manager_or_higher())) WITH CHECK ((SELECT public.is_staff_manager_or_higher()));

DROP POLICY IF EXISTS program_participants_read ON public.program_participants;
CREATE POLICY program_participants_read ON public.program_participants FOR SELECT USING ((SELECT public.user_has_crm_access()));
DROP POLICY IF EXISTS program_participants_write_staff ON public.program_participants;
CREATE POLICY program_participants_write_staff ON public.program_participants FOR ALL USING ((SELECT public.is_staff_member_or_higher())) WITH CHECK ((SELECT public.is_staff_member_or_higher()));

-- --- 13.8 EVENTS, EVENT STAFF & PARTICIPANTS ---
DROP POLICY IF EXISTS super_admin_all_events ON public.events;
CREATE POLICY super_admin_all_events ON public.events FOR ALL USING ((SELECT public.is_super_admin())) WITH CHECK ((SELECT public.is_super_admin()));
DROP POLICY IF EXISTS events_read_scoped ON public.events;
CREATE POLICY events_read_scoped ON public.events FOR SELECT USING (
  (SELECT public.user_has_crm_access()) AND (
    (SELECT public.is_staff_manager_or_higher()) OR 
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = (SELECT public.current_user_id()) AND u.events_scope = 'ALL') OR
    id IN (SELECT event_id FROM public.user_event_access WHERE user_id = (SELECT public.current_user_id())) OR
    id IN (SELECT event_id FROM public.event_staff WHERE user_id = (SELECT public.current_user_id()))
  )
);
DROP POLICY IF EXISTS events_insert_staff ON public.events;
CREATE POLICY events_insert_staff ON public.events FOR INSERT WITH CHECK ((SELECT public.is_staff_member_or_higher()));
DROP POLICY IF EXISTS events_update_staff ON public.events;
CREATE POLICY events_update_staff ON public.events FOR UPDATE USING (
  (SELECT public.is_staff_manager_or_higher()) OR facilitator_id = (SELECT public.current_user_id())
) WITH CHECK (
  (SELECT public.is_staff_manager_or_higher()) OR facilitator_id = (SELECT public.current_user_id())
);
DROP POLICY IF EXISTS events_delete_manager ON public.events;
CREATE POLICY events_delete_manager ON public.events FOR DELETE USING ((SELECT public.is_staff_manager_or_higher()));

DROP POLICY IF EXISTS event_staff_read ON public.event_staff;
CREATE POLICY event_staff_read ON public.event_staff FOR SELECT USING ((SELECT public.user_has_crm_access()));
DROP POLICY IF EXISTS event_staff_write_manager ON public.event_staff;
CREATE POLICY event_staff_write_manager ON public.event_staff FOR ALL USING ((SELECT public.is_staff_manager_or_higher())) WITH CHECK ((SELECT public.is_staff_manager_or_higher()));

DROP POLICY IF EXISTS event_participants_read ON public.event_participants;
CREATE POLICY event_participants_read ON public.event_participants FOR SELECT USING ((SELECT public.user_has_crm_access()));
DROP POLICY IF EXISTS event_participants_write_staff ON public.event_participants;
CREATE POLICY event_participants_write_staff ON public.event_participants FOR ALL USING ((SELECT public.is_staff_member_or_higher())) WITH CHECK ((SELECT public.is_staff_member_or_higher()));

-- --- 13.9 TASKS ---
DROP POLICY IF EXISTS tasks_super_admin ON public.tasks;
CREATE POLICY tasks_super_admin ON public.tasks FOR ALL USING ((SELECT public.is_super_admin())) WITH CHECK ((SELECT public.is_super_admin()));
DROP POLICY IF EXISTS tasks_read_scoped ON public.tasks;
CREATE POLICY tasks_read_scoped ON public.tasks FOR SELECT USING (
  (SELECT public.user_has_crm_access()) AND (
    (SELECT public.is_staff_manager_or_higher()) OR assigned_to = (SELECT public.current_user_id()) OR created_by = (SELECT public.current_user_id())
  )
);
DROP POLICY IF EXISTS tasks_insert_staff ON public.tasks;
CREATE POLICY tasks_insert_staff ON public.tasks FOR INSERT WITH CHECK (
  (SELECT public.is_staff_member_or_higher()) AND (created_by IS NULL OR created_by = (SELECT public.current_user_id()))
);
DROP POLICY IF EXISTS tasks_update_staff ON public.tasks;
CREATE POLICY tasks_update_staff ON public.tasks FOR UPDATE USING (
  (SELECT public.is_staff_manager_or_higher()) OR assigned_to = (SELECT public.current_user_id()) OR created_by = (SELECT public.current_user_id())
) WITH CHECK (
  (SELECT public.is_staff_manager_or_higher()) OR assigned_to = (SELECT public.current_user_id()) OR created_by = (SELECT public.current_user_id())
);
DROP POLICY IF EXISTS tasks_delete_manager ON public.tasks;
CREATE POLICY tasks_delete_manager ON public.tasks FOR DELETE USING (
  (SELECT public.is_staff_manager_or_higher()) OR created_by = (SELECT public.current_user_id())
);

-- --- 13.10 INTERACTIONS ---
DROP POLICY IF EXISTS interactions_super_admin ON public.interactions;
CREATE POLICY interactions_super_admin ON public.interactions FOR ALL USING ((SELECT public.is_super_admin())) WITH CHECK ((SELECT public.is_super_admin()));
DROP POLICY IF EXISTS interactions_read_staff ON public.interactions;
CREATE POLICY interactions_read_staff ON public.interactions FOR SELECT USING (
  (SELECT public.user_has_crm_access()) AND ((SELECT public.is_staff_member_or_higher()) OR user_id = (SELECT public.current_user_id()))
);
DROP POLICY IF EXISTS interactions_insert_staff ON public.interactions;
CREATE POLICY interactions_insert_staff ON public.interactions FOR INSERT WITH CHECK (
  (SELECT public.is_staff_member_or_higher()) AND (user_id IS NULL OR user_id = (SELECT public.current_user_id()))
);
DROP POLICY IF EXISTS interactions_update_author ON public.interactions;
CREATE POLICY interactions_update_author ON public.interactions FOR UPDATE USING (
  (SELECT public.is_super_admin()) OR user_id = (SELECT public.current_user_id())
) WITH CHECK (
  (SELECT public.is_super_admin()) OR user_id = (SELECT public.current_user_id())
);
DROP POLICY IF EXISTS interactions_delete_super_admin ON public.interactions;
CREATE POLICY interactions_delete_super_admin ON public.interactions FOR DELETE USING ((SELECT public.is_super_admin()));

-- --- 13.11 FUNDING RECORDS (Zero Volunteer Access; Scoped to Management and Finance) ---
DROP POLICY IF EXISTS super_admin_all_funding ON public.funding_records;
CREATE POLICY super_admin_all_funding ON public.funding_records FOR ALL USING ((SELECT public.is_super_admin())) WITH CHECK ((SELECT public.is_super_admin()));
DROP POLICY IF EXISTS funding_authorized_view ON public.funding_records;
CREATE POLICY funding_authorized_view ON public.funding_records FOR SELECT USING (
  (SELECT public.user_has_crm_access()) AND (
    (SELECT public.is_staff_manager_or_higher()) OR 
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = (SELECT public.current_user_id()) AND u.funding_scope IN ('ALL', 'VIEW'))
  )
);
DROP POLICY IF EXISTS funding_insert_manager ON public.funding_records;
CREATE POLICY funding_insert_manager ON public.funding_records FOR INSERT WITH CHECK (
  (SELECT public.is_staff_manager_or_higher()) OR 
  EXISTS (SELECT 1 FROM public.users u WHERE u.id = (SELECT public.current_user_id()) AND u.funding_scope = 'ALL')
);
DROP POLICY IF EXISTS funding_update_manager ON public.funding_records;
CREATE POLICY funding_update_manager ON public.funding_records FOR UPDATE USING (
  (SELECT public.is_staff_manager_or_higher()) OR 
  EXISTS (SELECT 1 FROM public.users u WHERE u.id = (SELECT public.current_user_id()) AND u.funding_scope = 'ALL')
) WITH CHECK (
  (SELECT public.is_staff_manager_or_higher()) OR 
  EXISTS (SELECT 1 FROM public.users u WHERE u.id = (SELECT public.current_user_id()) AND u.funding_scope = 'ALL')
);
DROP POLICY IF EXISTS funding_delete_super_admin ON public.funding_records;
CREATE POLICY funding_delete_super_admin ON public.funding_records FOR DELETE USING ((SELECT public.is_super_admin()));

-- --- 13.12 DOCUMENTS (Tiered Confidentiality Access) ---
DROP POLICY IF EXISTS super_admin_all_documents ON public.documents;
CREATE POLICY super_admin_all_documents ON public.documents FOR ALL USING ((SELECT public.is_super_admin())) WITH CHECK ((SELECT public.is_super_admin()));

DROP POLICY IF EXISTS documents_role_governed_view ON public.documents;
CREATE POLICY documents_role_governed_view ON public.documents FOR SELECT USING (
  (SELECT public.user_has_crm_access()) AND (
    (SELECT public.is_staff_manager_or_higher()) OR
    ((SELECT public.is_staff_member_or_higher()) AND (is_confidential = FALSE OR access_tier IN ('all', 'staff'))) OR
    (is_confidential = FALSE AND access_tier = 'all')
  )
);

DROP POLICY IF EXISTS documents_staff_insert ON public.documents;
CREATE POLICY documents_staff_insert ON public.documents FOR INSERT WITH CHECK (
  (SELECT public.user_has_crm_access()) AND (SELECT public.is_staff_member_or_higher())
);

DROP POLICY IF EXISTS documents_owner_or_manager_modify ON public.documents;
CREATE POLICY documents_owner_or_manager_modify ON public.documents FOR UPDATE USING (
  (SELECT public.user_has_crm_access()) AND (
    (SELECT public.is_staff_manager_or_higher()) OR added_by = (SELECT public.current_user_id())
  )
) WITH CHECK (
  (SELECT public.user_has_crm_access()) AND (
    (SELECT public.is_staff_manager_or_higher()) OR added_by = (SELECT public.current_user_id())
  )
);

DROP POLICY IF EXISTS documents_owner_or_manager_delete ON public.documents;
CREATE POLICY documents_owner_or_manager_delete ON public.documents FOR DELETE USING (
  (SELECT public.user_has_crm_access()) AND (
    (SELECT public.is_staff_manager_or_higher()) OR added_by = (SELECT public.current_user_id())
  )
);

-- --- 13.13 USER SCOPING ACCESS TABLES ---
DROP POLICY IF EXISTS user_program_access_read ON public.user_program_access;
CREATE POLICY user_program_access_read ON public.user_program_access FOR SELECT USING (
  (SELECT public.is_staff_manager_or_higher()) OR user_id = (SELECT public.current_user_id())
);
DROP POLICY IF EXISTS user_program_access_write ON public.user_program_access;
CREATE POLICY user_program_access_write ON public.user_program_access FOR ALL USING ((SELECT public.is_staff_manager_or_higher())) WITH CHECK ((SELECT public.is_staff_manager_or_higher()));

DROP POLICY IF EXISTS user_event_access_read ON public.user_event_access;
CREATE POLICY user_event_access_read ON public.user_event_access FOR SELECT USING (
  (SELECT public.is_staff_manager_or_higher()) OR user_id = (SELECT public.current_user_id())
);
DROP POLICY IF EXISTS user_event_access_write ON public.user_event_access;
CREATE POLICY user_event_access_write ON public.user_event_access FOR ALL USING ((SELECT public.is_staff_manager_or_higher())) WITH CHECK ((SELECT public.is_staff_manager_or_higher()));

-- --- 13.14 AUDIT LOGS (Immutable & Append-Only) ---
DROP POLICY IF EXISTS audit_logs_read_authorized ON public.audit_logs;
CREATE POLICY audit_logs_read_authorized ON public.audit_logs FOR SELECT USING (
  (SELECT public.is_super_admin()) OR (SELECT public.is_staff_manager_or_higher())
);
DROP POLICY IF EXISTS audit_logs_insert_append ON public.audit_logs;
CREATE POLICY audit_logs_insert_append ON public.audit_logs FOR INSERT WITH CHECK (
  (SELECT auth.role()) IN ('authenticated', 'service_role') OR (SELECT public.user_has_crm_access())
);
-- Note: Zero UPDATE or DELETE policies exist for audit_logs.

-- --- 13.15 GROUNDED AI & CSV ANALYTICS ---
DROP POLICY IF EXISTS analysis_files_super_admin ON public.analysis_files;
CREATE POLICY analysis_files_super_admin ON public.analysis_files FOR ALL USING ((SELECT public.is_super_admin())) WITH CHECK ((SELECT public.is_super_admin()));
DROP POLICY IF EXISTS analysis_files_read ON public.analysis_files;
CREATE POLICY analysis_files_read ON public.analysis_files FOR SELECT USING (
  (SELECT public.user_has_crm_access()) AND organization_id = (SELECT public.current_user_org_id())
);
DROP POLICY IF EXISTS analysis_files_insert ON public.analysis_files;
CREATE POLICY analysis_files_insert ON public.analysis_files FOR INSERT WITH CHECK (
  (SELECT public.is_staff_member_or_higher()) AND organization_id = (SELECT public.current_user_org_id())
);
DROP POLICY IF EXISTS analysis_files_delete ON public.analysis_files;
CREATE POLICY analysis_files_delete ON public.analysis_files FOR DELETE USING (
  (SELECT public.is_staff_manager_or_higher()) AND organization_id = (SELECT public.current_user_org_id())
);

DROP POLICY IF EXISTS super_admin_all_intelligence ON public.analysis_jobs;
CREATE POLICY super_admin_all_intelligence ON public.analysis_jobs FOR ALL USING ((SELECT public.is_super_admin())) WITH CHECK ((SELECT public.is_super_admin()));
DROP POLICY IF EXISTS staff_intelligence_access ON public.analysis_jobs;
CREATE POLICY staff_intelligence_access ON public.analysis_jobs FOR SELECT USING (
  (SELECT public.user_has_crm_access()) AND organization_id = (SELECT public.current_user_org_id())
);
DROP POLICY IF EXISTS staff_intelligence_insert ON public.analysis_jobs;
CREATE POLICY staff_intelligence_insert ON public.analysis_jobs FOR INSERT WITH CHECK (
  (SELECT public.is_staff_member_or_higher()) AND organization_id = (SELECT public.current_user_org_id())
);

DROP POLICY IF EXISTS analysis_results_super_admin ON public.analysis_results;
CREATE POLICY analysis_results_super_admin ON public.analysis_results FOR ALL USING ((SELECT public.is_super_admin())) WITH CHECK ((SELECT public.is_super_admin()));
DROP POLICY IF EXISTS analysis_results_read ON public.analysis_results;
CREATE POLICY analysis_results_read ON public.analysis_results FOR SELECT USING (
  (SELECT public.user_has_crm_access()) AND analysis_job_id IN (SELECT id FROM public.analysis_jobs WHERE organization_id = (SELECT public.current_user_org_id()))
);

DROP POLICY IF EXISTS analysis_metrics_super_admin ON public.analysis_metrics;
CREATE POLICY analysis_metrics_super_admin ON public.analysis_metrics FOR ALL USING ((SELECT public.is_super_admin())) WITH CHECK ((SELECT public.is_super_admin()));
DROP POLICY IF EXISTS analysis_metrics_read ON public.analysis_metrics;
CREATE POLICY analysis_metrics_read ON public.analysis_metrics FOR SELECT USING ((SELECT public.user_has_crm_access()));

DROP POLICY IF EXISTS analysis_insights_super_admin ON public.analysis_insights;
CREATE POLICY analysis_insights_super_admin ON public.analysis_insights FOR ALL USING ((SELECT public.is_super_admin())) WITH CHECK ((SELECT public.is_super_admin()));
DROP POLICY IF EXISTS analysis_insights_read ON public.analysis_insights;
CREATE POLICY analysis_insights_read ON public.analysis_insights FOR SELECT USING ((SELECT public.user_has_crm_access()));

DROP POLICY IF EXISTS super_admin_ai_logs ON public.ai_requests;
CREATE POLICY super_admin_ai_logs ON public.ai_requests FOR ALL USING ((SELECT public.is_super_admin())) WITH CHECK ((SELECT public.is_super_admin()));
DROP POLICY IF EXISTS ai_requests_staff_insert ON public.ai_requests;
CREATE POLICY ai_requests_staff_insert ON public.ai_requests FOR INSERT WITH CHECK (
  (SELECT public.user_has_crm_access()) AND user_id = (SELECT public.current_user_id())
);

DROP POLICY IF EXISTS super_admin_ai_usage ON public.ai_usage_logs;
CREATE POLICY super_admin_ai_usage ON public.ai_usage_logs FOR ALL USING ((SELECT public.is_super_admin())) WITH CHECK ((SELECT public.is_super_admin()));
DROP POLICY IF EXISTS staff_ai_usage_read ON public.ai_usage_logs;
CREATE POLICY staff_ai_usage_read ON public.ai_usage_logs FOR SELECT USING (
  (SELECT public.user_has_crm_access()) AND organization_id = (SELECT public.current_user_org_id())
);

-- ==============================================================================
-- 14. SUPABASE STORAGE BUCKETS & STORAGE OBJECT RLS POLICIES
-- ==============================================================================

-- 1. Register All Four Private Storage Buckets (Strictly public = false)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'buckets') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES 
      (
        'tip-crm-private-documents', 
        'tip-crm-private-documents', 
        false, 
        10485760, -- 10MB limit
        ARRAY[
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'text/csv',
          'text/plain',
          'image/png',
          'image/jpeg',
          'image/webp'
        ]
      ),
      (
        'crm_documents', 
        'crm_documents', 
        false, 
        10485760,
        ARRAY[
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'text/csv',
          'text/plain',
          'image/png',
          'image/jpeg',
          'image/webp'
        ]
      ),
      (
        'crm_attachments', 
        'crm_attachments', 
        false, 
        10485760,
        ARRAY[
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'text/csv',
          'text/plain',
          'image/png',
          'image/jpeg',
          'image/webp'
        ]
      ),
      (
        'crm_backups', 
        'crm_backups', 
        false, 
        26214400, -- 25MB limit
        ARRAY['application/json']
      )
    ON CONFLICT (id) DO UPDATE SET
      public = false,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;
  END IF;
END $$;

-- 2. Storage Object Level RLS Policies on storage.objects
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'objects') THEN
    EXECUTE '
      DROP POLICY IF EXISTS storage_documents_read ON storage.objects;
      DROP POLICY IF EXISTS tip_storage_private_select ON storage.objects;
      CREATE POLICY storage_documents_read ON storage.objects
        FOR SELECT USING (
          bucket_id IN (''tip-crm-private-documents'', ''crm_documents'', ''crm_attachments'') AND (
            (SELECT public.is_super_admin()) OR 
            (SELECT public.is_staff_manager_or_higher()) OR 
            (
              (SELECT public.is_staff_member_or_higher()) AND EXISTS (
                SELECT 1 FROM public.documents d 
                WHERE d.storage_path = name 
                  AND (d.is_confidential = FALSE OR d.access_tier IN (''all'', ''staff''))
              )
            ) OR
            EXISTS (
              SELECT 1 FROM public.documents d 
              WHERE d.storage_path = name 
                AND d.is_confidential = FALSE 
                AND d.access_tier = ''all''
            )
          )
        );

      DROP POLICY IF EXISTS storage_documents_insert ON storage.objects;
      DROP POLICY IF EXISTS tip_storage_private_insert ON storage.objects;
      CREATE POLICY storage_documents_insert ON storage.objects
        FOR INSERT WITH CHECK (
          bucket_id IN (''tip-crm-private-documents'', ''crm_documents'', ''crm_attachments'') AND (
            (SELECT public.is_super_admin()) OR (SELECT public.is_staff_member_or_higher())
          )
        );

      DROP POLICY IF EXISTS storage_documents_delete ON storage.objects;
      DROP POLICY IF EXISTS tip_storage_private_delete ON storage.objects;
      CREATE POLICY storage_documents_delete ON storage.objects
        FOR DELETE USING (
          bucket_id IN (''tip-crm-private-documents'', ''crm_documents'', ''crm_attachments'') AND (
            (SELECT public.is_super_admin()) OR (SELECT public.is_staff_manager_or_higher()) OR owner = (SELECT auth.uid())
          )
        );

      DROP POLICY IF EXISTS storage_backups_super_admin ON storage.objects;
      CREATE POLICY storage_backups_super_admin ON storage.objects
        FOR ALL USING (
          bucket_id = ''crm_backups'' AND (SELECT public.is_super_admin())
        );
    ';
  END IF;
END $$;

-- ==============================================================================
-- 15. BASELINE SYSTEM SEED DATA (Zero Personal Data / Safe Defaults)
-- ==============================================================================

-- 1. Default Tenant Organization (The Inclusion Project)
INSERT INTO public.organizations (id, name, type, sector, website, email, city, province)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'The Inclusion Project (TIP)',
  'Partner',
  'Civil Society & Equity Research',
  'https://theinclusionproject.com',
  'info@theinclusionproject.com',
  'Vancouver',
  'British Columbia'
) ON CONFLICT (id) DO NOTHING;

-- 2. System Baseline Roles
INSERT INTO public.roles (id, name, description, is_system_role)
VALUES
  ('super_admin', 'Super Administrator', 'Full administrative authority across all modules, users, security policies, and system settings.', TRUE),
  ('staff_manager', 'Staff Manager', 'Management oversight for programs, events, contacts, documents, and operational reports.', TRUE),
  ('staff_member', 'Staff Member', 'Operational access to assigned programs, events, tasks, contacts, and non-confidential documents.', TRUE),
  ('volunteer', 'Volunteer', 'Assigned participation in specific workshops and public community initiatives. Zero financial access.', TRUE)
ON CONFLICT (id) DO NOTHING;

-- 3. Core Permissions (Resource + Action)
INSERT INTO public.permissions (resource, action, description)
VALUES
  ('users', 'manage', 'Create, approve, deactivate, and manage CRM user accounts'),
  ('users', 'view', 'View team member directory and profile metadata'),
  ('people', 'manage', 'Create, update, export, and delete contacts'),
  ('people', 'view', 'View contact directory entries within user data scope'),
  ('programs', 'manage', 'Create, edit, budget, and archive initiatives and cohorts'),
  ('programs', 'view', 'View programs and cohorts assigned or organization-wide'),
  ('events', 'manage', 'Schedule, edit, and record attendance for workshops and forums'),
  ('events', 'view', 'View scheduled events and session rosters'),
  ('tasks', 'manage', 'Assign, update status, and prioritize work milestones'),
  ('tasks', 'view', 'View tasks assigned to user or team'),
  ('funding', 'manage', 'Create, edit, reconcile, and delete fiduciary records and grants'),
  ('funding', 'view', 'View confidential grant and donor allocations'),
  ('documents', 'manage', 'Upload, classify, and delete storage files and cloud assets'),
  ('documents', 'view', 'Access documents according to role confidentiality tier'),
  ('audit_logs', 'view', 'Inspect security audit trail records'),
  ('intelligence', 'manage', 'Upload datasets for grounded CSV profiling and AI analytics'),
  ('intelligence', 'view', 'Read generated metrics and analytical breakdowns')
ON CONFLICT (resource, action) DO NOTHING;

-- 4. Role-to-Permission Baseline Mappings
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT 'super_admin', id FROM public.permissions
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT 'staff_manager', id FROM public.permissions 
WHERE resource NOT IN ('audit_logs') OR (resource = 'audit_logs' AND action = 'view')
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT 'staff_member', id FROM public.permissions 
WHERE resource NOT IN ('funding', 'audit_logs') AND action IN ('view', 'manage')
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT 'volunteer', id FROM public.permissions 
WHERE resource IN ('events', 'tasks') AND action = 'view'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ==============================================================================
-- 16. PRIVILEGE HARDENING & ANONYMOUS ACCESS RESTRICTION
-- ==============================================================================

-- Revoke default public execution privileges on sensitive procedures
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'purge_audit_logs_older_than') THEN
    REVOKE EXECUTE ON FUNCTION public.purge_audit_logs_older_than(INTEGER) FROM PUBLIC;
    REVOKE EXECUTE ON FUNCTION public.purge_audit_logs_older_than(INTEGER) FROM anon;
    GRANT EXECUTE ON FUNCTION public.purge_audit_logs_older_than(INTEGER) TO authenticated;
  END IF;
END $$;

-- Prevent anonymous role from executing arbitrary mutations on public schema
REVOKE CREATE ON SCHEMA public FROM anon;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;

COMMIT;

-- ==============================================================================
-- END OF SCRIPT: TIP CRM Database Deployment Complete
-- Total Public Tables: 28
-- Status: Production-Ready, 100% Idempotent, Subquery-Optimized RLS Enabled
-- ==============================================================================
