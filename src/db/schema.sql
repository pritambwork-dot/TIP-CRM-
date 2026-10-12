-- ==============================================================================
-- TIP CRM — PostgreSQL / Supabase Production Database Schema
-- Architecture: 4-Level RBAC + Data-Level Access Control (RLS)
-- Domains: Identity, CRM, Programs, Work, Funding, Documents, Audit
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. EXTENSIONS & ENUMS
-- ------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE user_role_level AS ENUM ('super_admin', 'staff_manager', 'staff_member', 'volunteer');
CREATE TYPE user_account_status AS ENUM ('pending', 'approved', 'rejected', 'suspended', 'disabled');
CREATE TYPE data_scope_type AS ENUM ('GLOBAL', 'ORGANIZATION', 'PROGRAM', 'EVENT', 'ASSIGNED', 'OWN_RECORD');

CREATE TYPE relationship_type AS ENUM (
  'Partner', 'Funder / Donor', 'Participant', 'Volunteer', 
  'Advisor', 'Facilitator', 'Stakeholder', 'Other'
);

CREATE TYPE organization_type AS ENUM (
  'Partner', 'Funder', 'Community Organization', 'Institution', 
  'Company', 'Government Organization', 'University', 'Other'
);

CREATE TYPE program_status AS ENUM ('Planning', 'Active', 'On Hold', 'Completed', 'Archived');
CREATE TYPE project_status AS ENUM ('Planning', 'Active', 'On Hold', 'Completed', 'Archived');
CREATE TYPE event_type AS ENUM ('Workshop', 'Consultation', 'Community Forum', 'Training', 'Panel', 'Youth Lab');
CREATE TYPE participant_status AS ENUM ('Registered', 'Attended', 'Did not attend', 'Completed', 'Waitlisted', 'Withdrawn');
CREATE TYPE task_priority AS ENUM ('Low', 'Medium', 'High');
CREATE TYPE task_status AS ENUM ('To Do', 'In Progress', 'Completed', 'Cancelled');
CREATE TYPE interaction_type AS ENUM ('Email', 'Meeting', 'Call', 'Workshop', 'Note', 'Follow-up', 'Other');
CREATE TYPE funding_status AS ENUM ('Received', 'Pledged', 'Pending Review', 'Approved', 'Applied', 'Prospective');

-- ------------------------------------------------------------------------------
-- 2. IDENTITY & ACCESS CONTROL (RBAC - Sections 13-21)
-- ------------------------------------------------------------------------------

-- Organizations (Root entity for multi-tenant isolation)
CREATE TABLE organizations (
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

-- Roles table (Section 15)
CREATE TABLE roles (
  id VARCHAR(50) PRIMARY KEY, -- 'super_admin', 'staff_manager', 'staff_member', 'volunteer'
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_system_role BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Permissions table: RESOURCE + ACTION (Section 16)
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resource VARCHAR(50) NOT NULL, -- e.g. 'people', 'programs', 'funding', 'users'
  action VARCHAR(50) NOT NULL,   -- e.g. 'view', 'create', 'edit', 'delete', 'manage'
  description TEXT,
  CONSTRAINT uq_resource_action UNIQUE (resource, action)
);

-- Role Permissions map (Section 17)
CREATE TABLE role_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_id VARCHAR(50) REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
  CONSTRAINT uq_role_permission UNIQUE (role_id, permission_id)
);

-- Users table (Section 14)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id VARCHAR(100) UNIQUE, -- references authenticated Supabase Auth user
  organization_id UUID REFERENCES organizations(id) ON DELETE RESTRICT,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  avatar_url TEXT,
  phone VARCHAR(50),
  title VARCHAR(150),
  status user_account_status DEFAULT 'pending',
  is_active BOOLEAN DEFAULT FALSE,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Data Scope Configurations (Section 19)
  people_scope data_scope_type DEFAULT 'ASSIGNED',
  programs_scope data_scope_type DEFAULT 'ASSIGNED',
  events_scope data_scope_type DEFAULT 'ASSIGNED',
  funding_scope VARCHAR(20) DEFAULT 'NONE', -- 'ALL', 'VIEW', 'NONE'
  
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Roles table (Section 18)
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role_id VARCHAR(50) REFERENCES roles(id) ON DELETE RESTRICT,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_user_role UNIQUE (user_id, role_id)
);

-- Access Requests table (Section 7, 8)
CREATE TABLE access_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  provider VARCHAR(50) DEFAULT 'google',
  status user_account_status DEFAULT 'pending',
  notes TEXT,
  rejection_reason TEXT,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ
);

-- User Program Access (Section 20)
CREATE TABLE user_program_access (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  program_id UUID NOT NULL,
  granted_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_user_program UNIQUE (user_id, program_id)
);

-- User Event Access (Section 21)
CREATE TABLE user_event_access (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  event_id UUID NOT NULL,
  granted_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_user_event UNIQUE (user_id, event_id)
);

-- ------------------------------------------------------------------------------
-- 3. CRM DOMAIN: PEOPLE & ENTITIES
-- ------------------------------------------------------------------------------

CREATE TABLE people (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  role_title VARCHAR(150),
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  relationship_types relationship_type[] DEFAULT ARRAY['Participant']::relationship_type[],
  city VARCHAR(100),
  province VARCHAR(100),
  notes TEXT,
  mailchimp_status VARCHAR(50) DEFAULT 'pending',
  last_interaction_date DATE,
  next_follow_up_date DATE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 4. PROGRAMS & EVENTS DOMAIN
-- ------------------------------------------------------------------------------

CREATE TABLE programs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status program_status DEFAULT 'Active',
  start_date DATE,
  end_date DATE,
  owner_id UUID REFERENCES users(id),
  budget_cad NUMERIC(12, 2) DEFAULT 0.00,
  outcomes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Program Members (Staff & Volunteers assigned to program)
CREATE TABLE program_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  program_id UUID REFERENCES programs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'Member',
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_program_user UNIQUE (program_id, user_id)
);

-- Program Participants (People enrolled in program)
CREATE TABLE program_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  program_id UUID REFERENCES programs(id) ON DELETE CASCADE,
  person_id UUID REFERENCES people(id) ON DELETE CASCADE,
  status participant_status DEFAULT 'Registered',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_program_person UNIQUE (program_id, person_id)
);

-- Projects (Sub-initiatives & deliverables under Programs: Program -> Project -> Work)
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status project_status DEFAULT 'Active',
  owner_name VARCHAR(150),
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project Participants
CREATE TABLE project_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  person_id UUID REFERENCES people(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_project_person UNIQUE (project_id, person_id)
);

CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  program_id UUID REFERENCES programs(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  event_type event_type DEFAULT 'Workshop',
  date DATE NOT NULL,
  time VARCHAR(50),
  location VARCHAR(255),
  is_online BOOLEAN DEFAULT FALSE,
  meeting_link VARCHAR(255),
  capacity INT DEFAULT 50,
  facilitator_id UUID REFERENCES users(id),
  description TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Event Staff Assignments
CREATE TABLE event_staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'Facilitator',
  CONSTRAINT uq_event_user UNIQUE (event_id, user_id)
);

-- Event Participants & Attendance
CREATE TABLE event_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  person_id UUID REFERENCES people(id) ON DELETE CASCADE,
  registration_status participant_status DEFAULT 'Registered',
  attendance_status participant_status DEFAULT 'Registered',
  attended_at TIMESTAMPTZ,
  notes TEXT,
  CONSTRAINT uq_event_person UNIQUE (event_id, person_id)
);

-- ------------------------------------------------------------------------------
-- 5. WORK & COLLABORATION DOMAIN
-- ------------------------------------------------------------------------------

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id),
  related_person_id UUID REFERENCES people(id) ON DELETE SET NULL,
  related_program_id UUID REFERENCES programs(id) ON DELETE SET NULL,
  related_project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  related_event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  due_date DATE,
  priority task_priority DEFAULT 'Medium',
  status task_status DEFAULT 'To Do',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  person_id UUID REFERENCES people(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id),
  type interaction_type NOT NULL,
  summary VARCHAR(255) NOT NULL,
  details TEXT,
  interaction_date DATE NOT NULL,
  follow_up_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 6. FUNDING DOMAIN
-- ------------------------------------------------------------------------------

CREATE TABLE funding_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  donor_or_funder VARCHAR(255) NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  program_id UUID REFERENCES programs(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  amount_cad NUMERIC(12, 2) NOT NULL,
  date DATE NOT NULL,
  funding_type VARCHAR(100) NOT NULL,
  status funding_status DEFAULT 'Received',
  report_due_date DATE,
  fiscal_year VARCHAR(20),
  grant_deliverable_note TEXT,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 7. AUDIT LOGS & DOCUMENTS
-- ------------------------------------------------------------------------------

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  url TEXT NOT NULL,
  related_type VARCHAR(50),
  related_id UUID,
  description TEXT,
  added_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  user_name VARCHAR(255) NOT NULL,
  action VARCHAR(100) NOT NULL, -- e.g. 'user.create', 'role.update', 'person.delete'
  resource VARCHAR(50) NOT NULL,
  resource_id VARCHAR(100),
  entity_name VARCHAR(255),
  details TEXT,
  metadata JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 8. ROW LEVEL SECURITY (RLS) POLICIES (Sections 25-27)
-- ------------------------------------------------------------------------------

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE funding_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_requests ENABLE ROW LEVEL SECURITY;

-- Helper function: verify active approved user and extract identity
CREATE OR REPLACE FUNCTION get_current_app_user() 
RETURNS TABLE (
  user_id UUID,
  role_id VARCHAR,
  org_id UUID,
  is_approved BOOLEAN,
  is_active_user BOOLEAN
) AS $$
  SELECT 
    id AS user_id, 
    (SELECT role_id FROM user_roles WHERE user_id = users.id LIMIT 1) AS role_id,
    organization_id AS org_id,
    (status = 'approved') AS is_approved,
    is_active AS is_active_user
  FROM users 
  WHERE auth_user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Master Access Gate: All access requires an approved, active user
CREATE OR REPLACE FUNCTION user_has_crm_access() RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users 
    WHERE auth_user_id = auth.uid() 
      AND status = 'approved' 
      AND is_active = TRUE
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Super Admin Bypass Check
CREATE OR REPLACE FUNCTION is_super_admin() RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users u
    JOIN user_roles ur ON ur.user_id = u.id
    WHERE u.auth_user_id = auth.uid() 
      AND ur.role_id = 'super_admin'
      AND u.status = 'approved' 
      AND u.is_active = TRUE
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Organization Isolation Helper (Section 27)
CREATE OR REPLACE FUNCTION current_user_org_id() RETURNS UUID AS $$
  SELECT organization_id FROM users WHERE auth_user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- RLS: USERS TABLE
-- Super Admin can manage all users. Users can view team members in same organization.
CREATE POLICY super_admin_all_users ON users 
  FOR ALL USING (is_super_admin());

CREATE POLICY org_users_view ON users 
  FOR SELECT USING (user_has_crm_access() AND organization_id = current_user_org_id());

-- RLS: ACCESS REQUESTS TABLE
-- Super Admins review all requests. Authenticated user can see own pending request.
CREATE POLICY super_admin_access_requests ON access_requests 
  FOR ALL USING (is_super_admin());

CREATE POLICY own_access_request ON access_requests 
  FOR SELECT USING (auth_user_id = auth.uid());

CREATE POLICY insert_access_request ON access_requests 
  FOR INSERT WITH CHECK (auth_user_id = auth.uid());

-- RLS: PEOPLE TABLE
CREATE POLICY super_admin_all_people ON people 
  FOR ALL USING (is_super_admin());

CREATE POLICY people_org_and_scoped_view ON people 
  FOR SELECT USING (
    user_has_crm_access() AND (
      EXISTS (
        SELECT 1 FROM users u 
        JOIN user_roles ur ON ur.user_id = u.id
        WHERE u.auth_user_id = auth.uid() AND ur.role_id IN ('super_admin', 'staff_manager')
      ) OR
      id IN (
        SELECT person_id FROM program_participants WHERE program_id IN (
          SELECT program_id FROM user_program_access WHERE user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
        )
        UNION
        SELECT person_id FROM event_participants WHERE event_id IN (
          SELECT event_id FROM user_event_access WHERE user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
        )
      )
    )
  );

-- RLS: FUNDING RECORDS TABLE (Strictly hidden from volunteers and restricted staff)
CREATE POLICY super_admin_all_funding ON funding_records 
  FOR ALL USING (is_super_admin());

CREATE POLICY funding_authorized_view ON funding_records 
  FOR SELECT USING (
    user_has_crm_access() AND (
      EXISTS (
        SELECT 1 FROM users u 
        JOIN user_roles ur ON ur.user_id = u.id
        WHERE u.auth_user_id = auth.uid() AND (ur.role_id IN ('super_admin', 'staff_manager') OR u.funding_scope IN ('ALL', 'VIEW'))
      )
    )
  );

-- RLS: PROGRAMS TABLE
CREATE POLICY super_admin_all_programs ON programs 
  FOR ALL USING (is_super_admin());

CREATE POLICY programs_scoped_view ON programs 
  FOR SELECT USING (
    user_has_crm_access() AND (
      EXISTS (
        SELECT 1 FROM users u 
        JOIN user_roles ur ON ur.user_id = u.id
        WHERE u.auth_user_id = auth.uid() AND (ur.role_id IN ('super_admin', 'staff_manager') OR u.programs_scope = 'ALL')
      ) OR
      id IN (
        SELECT program_id FROM user_program_access WHERE user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
      )
    )
  );

-- RLS: PROJECTS TABLE
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY super_admin_all_projects ON projects 
  FOR ALL USING (is_super_admin());

CREATE POLICY projects_scoped_view ON projects 
  FOR SELECT USING (
    user_has_crm_access() AND (
      EXISTS (
        SELECT 1 FROM users u 
        JOIN user_roles ur ON ur.user_id = u.id
        WHERE u.auth_user_id = auth.uid() AND (ur.role_id IN ('super_admin', 'staff_manager') OR u.programs_scope = 'ALL')
      ) OR
      program_id IN (
        SELECT program_id FROM user_program_access WHERE user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
      )
    )
  );

-- RLS: AUDIT LOGS TABLE (Super Admin only)
CREATE POLICY super_admin_audit_logs ON audit_logs 
  FOR ALL USING (is_super_admin());

-- RLS: ORGANIZATIONS TABLE
CREATE POLICY super_admin_all_organizations ON organizations 
  FOR ALL USING (is_super_admin());

CREATE POLICY organizations_view ON organizations 
  FOR SELECT USING (user_has_crm_access());

CREATE POLICY organizations_staff_manage ON organizations 
  FOR ALL USING (
    user_has_crm_access() AND EXISTS (
      SELECT 1 FROM users u 
      JOIN user_roles ur ON ur.user_id = u.id 
      WHERE u.auth_user_id = auth.uid() AND ur.role_id IN ('super_admin', 'staff_manager', 'staff_member')
    )
  );

-- RLS: EVENTS TABLE
CREATE POLICY super_admin_all_events ON events 
  FOR ALL USING (is_super_admin());

CREATE POLICY events_scoped_view ON events 
  FOR SELECT USING (user_has_crm_access());

CREATE POLICY events_staff_manage ON events 
  FOR ALL USING (
    user_has_crm_access() AND EXISTS (
      SELECT 1 FROM users u 
      JOIN user_roles ur ON ur.user_id = u.id 
      WHERE u.auth_user_id = auth.uid() AND ur.role_id IN ('super_admin', 'staff_manager', 'staff_member')
    )
  );

-- RLS: TASKS TABLE
CREATE POLICY super_admin_all_tasks ON tasks 
  FOR ALL USING (is_super_admin());

CREATE POLICY tasks_scoped_view ON tasks 
  FOR SELECT USING (user_has_crm_access());

CREATE POLICY tasks_manage ON tasks 
  FOR ALL USING (user_has_crm_access());

-- RLS: INTERACTIONS TABLE
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY super_admin_all_interactions ON interactions 
  FOR ALL USING (is_super_admin());

CREATE POLICY interactions_scoped_view ON interactions 
  FOR SELECT USING (user_has_crm_access());

CREATE POLICY interactions_create ON interactions 
  FOR INSERT WITH CHECK (user_has_crm_access());

-- RLS: DOCUMENTS TABLE
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY super_admin_all_documents ON documents 
  FOR ALL USING (is_super_admin());

CREATE POLICY documents_scoped_view ON documents 
  FOR SELECT USING (user_has_crm_access());

CREATE POLICY documents_staff_manage ON documents 
  FOR ALL USING (
    user_has_crm_access() AND EXISTS (
      SELECT 1 FROM users u 
      JOIN user_roles ur ON ur.user_id = u.id 
      WHERE u.auth_user_id = auth.uid() AND ur.role_id IN ('super_admin', 'staff_manager', 'staff_member')
    )
  );

-- RLS: PARTICIPANTS TABLES
ALTER TABLE program_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY super_admin_all_prog_participants ON program_participants FOR ALL USING (is_super_admin());
CREATE POLICY prog_participants_view ON program_participants FOR SELECT USING (user_has_crm_access());
CREATE POLICY prog_participants_staff_manage ON program_participants FOR ALL USING (
  user_has_crm_access() AND EXISTS (
    SELECT 1 FROM users u JOIN user_roles ur ON ur.user_id = u.id 
    WHERE u.auth_user_id = auth.uid() AND ur.role_id IN ('super_admin', 'staff_manager', 'staff_member')
  )
);

CREATE POLICY super_admin_all_event_participants ON event_participants FOR ALL USING (is_super_admin());
CREATE POLICY event_participants_view ON event_participants FOR SELECT USING (user_has_crm_access());
CREATE POLICY event_participants_staff_manage ON event_participants FOR ALL USING (
  user_has_crm_access() AND EXISTS (
    SELECT 1 FROM users u JOIN user_roles ur ON ur.user_id = u.id 
    WHERE u.auth_user_id = auth.uid() AND ur.role_id IN ('super_admin', 'staff_manager', 'staff_member')
  )
);

CREATE POLICY super_admin_all_proj_participants ON project_participants FOR ALL USING (is_super_admin());
CREATE POLICY proj_participants_view ON project_participants FOR SELECT USING (user_has_crm_access());
CREATE POLICY proj_participants_staff_manage ON project_participants FOR ALL USING (
  user_has_crm_access() AND EXISTS (
    SELECT 1 FROM users u JOIN user_roles ur ON ur.user_id = u.id 
    WHERE u.auth_user_id = auth.uid() AND ur.role_id IN ('super_admin', 'staff_manager', 'staff_member')
  )
);

-- RLS: RBAC METADATA TABLES
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY super_admin_manage_roles ON roles FOR ALL USING (is_super_admin());
CREATE POLICY view_roles ON roles FOR SELECT USING (user_has_crm_access());

CREATE POLICY super_admin_manage_permissions ON permissions FOR ALL USING (is_super_admin());
CREATE POLICY view_permissions ON permissions FOR SELECT USING (user_has_crm_access());

CREATE POLICY super_admin_manage_role_permissions ON role_permissions FOR ALL USING (is_super_admin());
CREATE POLICY view_role_permissions ON role_permissions FOR SELECT USING (user_has_crm_access());

CREATE POLICY super_admin_manage_user_roles ON user_roles FOR ALL USING (is_super_admin());
CREATE POLICY view_user_roles ON user_roles FOR SELECT USING (user_has_crm_access());

-- ==============================================================================
-- 9. AI INTELLIGENCE & CSV ANALYTICS TABLES (Sections 48-55)
-- ==============================================================================

CREATE TYPE analysis_job_status AS ENUM ('queued', 'processing', 'completed', 'failed');
CREATE TYPE analysis_insight_type AS ENUM ('finding', 'trend', 'anomaly', 'opportunity', 'risk', 'recommendation', 'caveat');

-- Files uploaded for CSV analysis and profiling
CREATE TABLE analysis_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  file_type VARCHAR(50) DEFAULT 'text/csv',
  file_size BIGINT NOT NULL,
  row_count INTEGER NOT NULL,
  column_count INTEGER NOT NULL,
  checksum VARCHAR(64) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analysis processing jobs
CREATE TABLE analysis_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_id UUID NOT NULL REFERENCES analysis_files(id) ON DELETE CASCADE,
  status analysis_job_status DEFAULT 'queued',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- High-level analysis results
CREATE TABLE analysis_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  analysis_job_id UUID NOT NULL REFERENCES analysis_jobs(id) ON DELETE CASCADE,
  summary TEXT,
  data_quality_summary JSONB NOT NULL,
  calculation_version VARCHAR(50) DEFAULT 'tip-math-v1.0',
  ai_model VARCHAR(100) DEFAULT 'gemini-2.5-flash',
  ai_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Deterministic calculated metrics
CREATE TABLE analysis_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  analysis_result_id UUID NOT NULL REFERENCES analysis_results(id) ON DELETE CASCADE,
  metric_name VARCHAR(100) NOT NULL,
  metric_value NUMERIC NOT NULL,
  metric_type VARCHAR(50) NOT NULL, -- 'count', 'sum', 'average', 'median', 'percentage', 'rate', 'ratio'
  dimensions JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Grounded AI insights (Observed / Interpretation / Action)
CREATE TABLE analysis_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  analysis_result_id UUID NOT NULL REFERENCES analysis_results(id) ON DELETE CASCADE,
  insight_type analysis_insight_type NOT NULL,
  category VARCHAR(50) DEFAULT 'observed', -- 'observed', 'interpretation', 'action'
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  supporting_metrics JSONB,
  recommendation TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI telemetry and request logs (Section 54)
CREATE TABLE ai_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feature VARCHAR(100) NOT NULL, -- 'csv_analysis', 'natural_language_query', 'program_summary', etc.
  request_timestamp TIMESTAMPTZ DEFAULT NOW(),
  model VARCHAR(100) DEFAULT 'gemini-2.5-flash',
  input_token_estimate INTEGER DEFAULT 0,
  output_token_estimate INTEGER DEFAULT 0,
  latency_ms INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'success' -- 'success', 'fallback_deterministic', 'error'
);

-- Organization monthly AI usage logs (Section 55)
CREATE TABLE ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  period VARCHAR(7) NOT NULL, -- '2026-09'
  total_requests INTEGER DEFAULT 0,
  csv_analyses INTEGER DEFAULT 0,
  data_questions INTEGER DEFAULT 0,
  report_generations INTEGER DEFAULT 0,
  token_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (organization_id, period)
);

-- RLS: Enable RLS on intelligence tables
ALTER TABLE analysis_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY super_admin_all_intelligence ON analysis_jobs FOR ALL USING (is_super_admin());
CREATE POLICY staff_intelligence_access ON analysis_jobs FOR SELECT USING (user_has_crm_access());
CREATE POLICY super_admin_ai_logs ON ai_requests FOR ALL USING (is_super_admin());
CREATE POLICY super_admin_ai_usage ON ai_usage_logs FOR ALL USING (is_super_admin());

