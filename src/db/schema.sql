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
CREATE TYPE data_scope_type AS ENUM ('ALL', 'GLOBAL', 'ORGANIZATION', 'PROGRAM', 'EVENT', 'ASSIGNED', 'OWN_RECORD', 'SCOPED');

CREATE TYPE relationship_type AS ENUM (
  'Partner', 'Funder / Donor', 'Participant', 'Volunteer', 
  'Advisor', 'Facilitator', 'Stakeholder', 'Other'
);

CREATE TYPE organization_type AS ENUM (
  'Partner', 'Funder', 'Community Organization', 'Institution', 
  'Company', 'Government Organization', 'University', 'Other'
);

CREATE TYPE program_status AS ENUM ('Planning', 'Active', 'On Hold', 'Completed', 'Archived');
CREATE TYPE event_type AS ENUM ('Workshop', 'Consultation', 'Community Forum', 'Training', 'Panel', 'Youth Lab');
CREATE TYPE participant_status AS ENUM ('Registered', 'Attended', 'Did not attend', 'Completed', 'Waitlisted', 'Withdrawn');
CREATE TYPE task_priority AS ENUM ('Low', 'Medium', 'High');
CREATE TYPE task_status AS ENUM ('To Do', 'In Progress', 'Completed');
CREATE TYPE interaction_type AS ENUM ('Email', 'Meeting', 'Call', 'Workshop', 'Note', 'Follow-up');
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

CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  program_id UUID REFERENCES programs(id) ON DELETE SET NULL,
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
  actor_id VARCHAR(100) NOT NULL,
  actor_name VARCHAR(255) NOT NULL,
  actor_role VARCHAR(100) NOT NULL,
  action VARCHAR(100) NOT NULL, -- e.g. 'AUTH_ROLE_SWITCH', 'AUTH_PASSWORD_CHANGE', 'DATA_EXPORT_CSV', 'PERSON_DELETE'
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

-- Performance and Audit Search Indices (Check 12)
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX idx_audit_logs_outcome ON audit_logs(outcome);
CREATE INDEX idx_audit_logs_correlation_id ON audit_logs(correlation_id);

-- PostgreSQL Immutability Trigger: Strictly Forbid UPDATE and DELETE
CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs are strictly immutable: UPDATE and DELETE operations are forbidden.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_logs_immutable
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW
EXECUTE FUNCTION prevent_audit_log_modification();

-- Controlled Retention Procedure (Executed only by Super Admin through verified maintenance)
CREATE OR REPLACE FUNCTION purge_audit_logs_older_than(days_to_keep INTEGER)
RETURNS INTEGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Only Super Administrators can execute audit log retention archiving.';
  END IF;

  ALTER TABLE audit_logs DISABLE TRIGGER trg_audit_logs_immutable;
  
  DELETE FROM audit_logs 
  WHERE timestamp < (NOW() - (days_to_keep || ' days')::INTERVAL);
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  ALTER TABLE audit_logs ENABLE TRIGGER trg_audit_logs_immutable;
  RETURN deleted_count;
END;
$$;

-- ------------------------------------------------------------------------------
-- 8. ROW LEVEL SECURITY (RLS) POLICIES & FUNCTIONS (Security Check 14)
-- ------------------------------------------------------------------------------

-- Step 1: Enable RLS on ALL CRM tables (Default Deny for all unauthorized access)
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_program_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_event_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE funding_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Step 2: Trusted Helper Functions (SECURITY DEFINER with fixed search_path to prevent hijacking)

-- Helper: Master Access Gate (Verify active approved user status)
CREATE OR REPLACE FUNCTION user_has_crm_access() 
RETURNS BOOLEAN 
LANGUAGE sql 
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users 
    WHERE auth_user_id = auth.uid()::text 
      AND status = 'approved' 
      AND is_active = TRUE
  );
$$;

-- Helper: Extract current authenticated CRM user's primary UUID
CREATE OR REPLACE FUNCTION current_user_id() 
RETURNS UUID 
LANGUAGE sql 
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT id FROM users 
  WHERE auth_user_id = auth.uid()::text 
    AND status = 'approved' 
    AND is_active = TRUE 
  LIMIT 1;
$$;

-- Helper: Extract current user's organization UUID
CREATE OR REPLACE FUNCTION current_user_org_id() 
RETURNS UUID 
LANGUAGE sql 
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT organization_id FROM users 
  WHERE auth_user_id = auth.uid()::text 
    AND status = 'approved' 
    AND is_active = TRUE 
  LIMIT 1;
$$;

-- Helper: Super Admin Authorization Gate (Database-Verified, Never Client-Supplied)
CREATE OR REPLACE FUNCTION is_super_admin() 
RETURNS BOOLEAN 
LANGUAGE sql 
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users u
    JOIN user_roles ur ON ur.user_id = u.id
    WHERE u.auth_user_id = auth.uid()::text 
      AND ur.role_id = 'super_admin'
      AND u.status = 'approved' 
      AND u.is_active = TRUE
  );
$$;

-- Helper: Staff Manager or Higher Gate (Levels 1 & 2)
CREATE OR REPLACE FUNCTION is_staff_manager_or_higher() 
RETURNS BOOLEAN 
LANGUAGE sql 
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users u
    JOIN user_roles ur ON ur.user_id = u.id
    WHERE u.auth_user_id = auth.uid()::text 
      AND ur.role_id IN ('super_admin', 'staff_manager')
      AND u.status = 'approved' 
      AND u.is_active = TRUE
  );
$$;

-- Helper: Staff Member or Higher Gate (Levels 1, 2, & 3 - Excludes Volunteers)
CREATE OR REPLACE FUNCTION is_staff_member_or_higher() 
RETURNS BOOLEAN 
LANGUAGE sql 
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users u
    JOIN user_roles ur ON ur.user_id = u.id
    WHERE u.auth_user_id = auth.uid()::text 
      AND ur.role_id IN ('super_admin', 'staff_manager', 'staff_member')
      AND u.status = 'approved' 
      AND u.is_active = TRUE
  );
$$;

-- Helper: Full application user identity extraction
CREATE OR REPLACE FUNCTION get_current_app_user() 
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
    (SELECT role_id FROM user_roles WHERE user_id = users.id LIMIT 1) AS role_id,
    organization_id AS org_id,
    (status = 'approved') AS is_approved,
    is_active AS is_active_user
  FROM users 
  WHERE auth_user_id = auth.uid()::text;
$$;

-- Step 3: Trigger to prevent user self-elevation or unauthorized field modification
CREATE OR REPLACE FUNCTION check_users_self_elevation()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- If Super Admin or service role, allow authorized administrative changes
  IF is_super_admin() OR auth.role() = 'service_role' THEN
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

DROP TRIGGER IF EXISTS trg_prevent_self_elevation_users ON users;
CREATE TRIGGER trg_prevent_self_elevation_users
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION check_users_self_elevation();

-- Step 4: Granular, Least-Privilege RLS Policies

-- --- 1. ROLES, PERMISSIONS, ROLE_PERMISSIONS ---
DROP POLICY IF EXISTS roles_read_crm ON roles;
CREATE POLICY roles_read_crm ON roles FOR SELECT USING (user_has_crm_access());
DROP POLICY IF EXISTS roles_write_super_admin ON roles;
CREATE POLICY roles_write_super_admin ON roles FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS permissions_read_crm ON permissions;
CREATE POLICY permissions_read_crm ON permissions FOR SELECT USING (user_has_crm_access());
DROP POLICY IF EXISTS permissions_write_super_admin ON permissions;
CREATE POLICY permissions_write_super_admin ON permissions FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS role_permissions_read_crm ON role_permissions;
CREATE POLICY role_permissions_read_crm ON role_permissions FOR SELECT USING (user_has_crm_access());
DROP POLICY IF EXISTS role_permissions_write_super_admin ON role_permissions;
CREATE POLICY role_permissions_write_super_admin ON role_permissions FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

-- --- 2. USER ROLES (Strictly blocks self-promotion) ---
DROP POLICY IF EXISTS user_roles_read_authorized ON user_roles;
CREATE POLICY user_roles_read_authorized ON user_roles FOR SELECT USING (
  is_super_admin() OR user_id = current_user_id() OR (user_has_crm_access() AND user_id IN (SELECT id FROM users WHERE organization_id = current_user_org_id()))
);
DROP POLICY IF EXISTS user_roles_write_super_admin ON user_roles;
CREATE POLICY user_roles_write_super_admin ON user_roles FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

-- --- 3. USERS ---
DROP POLICY IF EXISTS super_admin_all_users ON users;
CREATE POLICY super_admin_all_users ON users FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());
DROP POLICY IF EXISTS org_users_view ON users;
CREATE POLICY org_users_view ON users FOR SELECT USING (user_has_crm_access() AND organization_id = current_user_org_id());
DROP POLICY IF EXISTS users_self_update ON users;
CREATE POLICY users_self_update ON users FOR UPDATE USING (
  auth_user_id = auth.uid()::text AND user_has_crm_access()
) WITH CHECK (
  auth_user_id = auth.uid()::text
);

-- --- 4. ACCESS REQUESTS ---
DROP POLICY IF EXISTS super_admin_access_requests ON access_requests;
CREATE POLICY super_admin_access_requests ON access_requests FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());
DROP POLICY IF EXISTS own_access_request ON access_requests;
CREATE POLICY own_access_request ON access_requests FOR SELECT USING (auth_user_id = auth.uid()::text);
DROP POLICY IF EXISTS insert_access_request ON access_requests;
CREATE POLICY insert_access_request ON access_requests FOR INSERT WITH CHECK (auth_user_id = auth.uid()::text);

-- --- 5. ORGANIZATIONS ---
DROP POLICY IF EXISTS organizations_super_admin ON organizations;
CREATE POLICY organizations_super_admin ON organizations FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());
DROP POLICY IF EXISTS organizations_read_crm ON organizations;
CREATE POLICY organizations_read_crm ON organizations FOR SELECT USING (user_has_crm_access());
DROP POLICY IF EXISTS organizations_update_manager ON organizations;
CREATE POLICY organizations_update_manager ON organizations FOR UPDATE USING (
  is_staff_manager_or_higher() AND id = current_user_org_id()
) WITH CHECK (
  id = current_user_org_id()
);

-- --- 6. PEOPLE (Contacts Directory) ---
DROP POLICY IF EXISTS super_admin_all_people ON people;
CREATE POLICY super_admin_all_people ON people FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());
DROP POLICY IF EXISTS people_read_scoped ON people;
CREATE POLICY people_read_scoped ON people FOR SELECT USING (
  user_has_crm_access() AND (
    is_staff_manager_or_higher() OR 
    EXISTS (SELECT 1 FROM users u WHERE u.id = current_user_id() AND u.people_scope = 'GLOBAL') OR
    organization_id = current_user_org_id() OR
    id IN (
      SELECT person_id FROM program_participants WHERE program_id IN (SELECT program_id FROM user_program_access WHERE user_id = current_user_id())
      UNION
      SELECT person_id FROM event_participants WHERE event_id IN (SELECT event_id FROM user_event_access WHERE user_id = current_user_id())
    ) OR
    created_by = current_user_id()
  )
);
DROP POLICY IF EXISTS people_insert_staff ON people;
CREATE POLICY people_insert_staff ON people FOR INSERT WITH CHECK (
  is_staff_member_or_higher() AND (organization_id IS NULL OR organization_id = current_user_org_id())
);
DROP POLICY IF EXISTS people_update_staff ON people;
CREATE POLICY people_update_staff ON people FOR UPDATE USING (
  is_staff_member_or_higher() AND (organization_id IS NULL OR organization_id = current_user_org_id())
) WITH CHECK (
  organization_id IS NULL OR organization_id = current_user_org_id()
);
DROP POLICY IF EXISTS people_delete_manager ON people;
CREATE POLICY people_delete_manager ON people FOR DELETE USING (
  is_staff_manager_or_higher() AND (organization_id IS NULL OR organization_id = current_user_org_id())
);

-- --- 7. PROGRAMS & PROGRAM MEMBERS/PARTICIPANTS ---
DROP POLICY IF EXISTS super_admin_all_programs ON programs;
CREATE POLICY super_admin_all_programs ON programs FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());
DROP POLICY IF EXISTS programs_scoped_view ON programs;
CREATE POLICY programs_scoped_view ON programs FOR SELECT USING (
  user_has_crm_access() AND (
    is_staff_manager_or_higher() OR 
    EXISTS (SELECT 1 FROM users u WHERE u.id = current_user_id() AND u.programs_scope = 'ALL') OR
    id IN (SELECT program_id FROM user_program_access WHERE user_id = current_user_id()) OR
    id IN (SELECT program_id FROM program_members WHERE user_id = current_user_id())
  )
);
DROP POLICY IF EXISTS programs_insert_manager ON programs;
CREATE POLICY programs_insert_manager ON programs FOR INSERT WITH CHECK (is_staff_manager_or_higher());
DROP POLICY IF EXISTS programs_update_manager ON programs;
CREATE POLICY programs_update_manager ON programs FOR UPDATE USING (
  is_staff_manager_or_higher() OR owner_id = current_user_id()
) WITH CHECK (
  is_staff_manager_or_higher() OR owner_id = current_user_id()
);
DROP POLICY IF EXISTS programs_delete_super_admin ON programs;
CREATE POLICY programs_delete_super_admin ON programs FOR DELETE USING (is_super_admin());

DROP POLICY IF EXISTS program_members_read ON program_members;
CREATE POLICY program_members_read ON program_members FOR SELECT USING (user_has_crm_access());
DROP POLICY IF EXISTS program_members_write_manager ON program_members;
CREATE POLICY program_members_write_manager ON program_members FOR ALL USING (is_staff_manager_or_higher()) WITH CHECK (is_staff_manager_or_higher());

DROP POLICY IF EXISTS program_participants_read ON program_participants;
CREATE POLICY program_participants_read ON program_participants FOR SELECT USING (user_has_crm_access());
DROP POLICY IF EXISTS program_participants_write_staff ON program_participants;
CREATE POLICY program_participants_write_staff ON program_participants FOR ALL USING (is_staff_member_or_higher()) WITH CHECK (is_staff_member_or_higher());

-- --- 8. EVENTS, EVENT STAFF & PARTICIPANTS ---
DROP POLICY IF EXISTS super_admin_all_events ON events;
CREATE POLICY super_admin_all_events ON events FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());
DROP POLICY IF EXISTS events_read_scoped ON events;
CREATE POLICY events_read_scoped ON events FOR SELECT USING (
  user_has_crm_access() AND (
    is_staff_manager_or_higher() OR 
    EXISTS (SELECT 1 FROM users u WHERE u.id = current_user_id() AND u.events_scope = 'ALL') OR
    id IN (SELECT event_id FROM user_event_access WHERE user_id = current_user_id()) OR
    id IN (SELECT event_id FROM event_staff WHERE user_id = current_user_id())
  )
);
DROP POLICY IF EXISTS events_insert_staff ON events;
CREATE POLICY events_insert_staff ON events FOR INSERT WITH CHECK (is_staff_member_or_higher());
DROP POLICY IF EXISTS events_update_staff ON events;
CREATE POLICY events_update_staff ON events FOR UPDATE USING (
  is_staff_manager_or_higher() OR facilitator_id = current_user_id()
) WITH CHECK (
  is_staff_manager_or_higher() OR facilitator_id = current_user_id()
);
DROP POLICY IF EXISTS events_delete_manager ON events;
CREATE POLICY events_delete_manager ON events FOR DELETE USING (is_staff_manager_or_higher());

DROP POLICY IF EXISTS event_staff_read ON event_staff;
CREATE POLICY event_staff_read ON event_staff FOR SELECT USING (user_has_crm_access());
DROP POLICY IF EXISTS event_staff_write_manager ON event_staff;
CREATE POLICY event_staff_write_manager ON event_staff FOR ALL USING (is_staff_manager_or_higher()) WITH CHECK (is_staff_manager_or_higher());

DROP POLICY IF EXISTS event_participants_read ON event_participants;
CREATE POLICY event_participants_read ON event_participants FOR SELECT USING (user_has_crm_access());
DROP POLICY IF EXISTS event_participants_write_staff ON event_participants;
CREATE POLICY event_participants_write_staff ON event_participants FOR ALL USING (is_staff_member_or_higher()) WITH CHECK (is_staff_member_or_higher());

-- --- 9. TASKS ---
DROP POLICY IF EXISTS tasks_super_admin ON tasks;
CREATE POLICY tasks_super_admin ON tasks FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());
DROP POLICY IF EXISTS tasks_read_scoped ON tasks;
CREATE POLICY tasks_read_scoped ON tasks FOR SELECT USING (
  user_has_crm_access() AND (
    is_staff_manager_or_higher() OR assigned_to = current_user_id() OR created_by = current_user_id()
  )
);
DROP POLICY IF EXISTS tasks_insert_staff ON tasks;
CREATE POLICY tasks_insert_staff ON tasks FOR INSERT WITH CHECK (
  is_staff_member_or_higher() AND (created_by IS NULL OR created_by = current_user_id())
);
DROP POLICY IF EXISTS tasks_update_staff ON tasks;
CREATE POLICY tasks_update_staff ON tasks FOR UPDATE USING (
  is_staff_manager_or_higher() OR assigned_to = current_user_id() OR created_by = current_user_id()
) WITH CHECK (
  is_staff_manager_or_higher() OR assigned_to = current_user_id() OR created_by = current_user_id()
);
DROP POLICY IF EXISTS tasks_delete_manager ON tasks;
CREATE POLICY tasks_delete_manager ON tasks FOR DELETE USING (
  is_staff_manager_or_higher() OR created_by = current_user_id()
);

-- --- 10. INTERACTIONS ---
DROP POLICY IF EXISTS interactions_super_admin ON interactions;
CREATE POLICY interactions_super_admin ON interactions FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());
DROP POLICY IF EXISTS interactions_read_staff ON interactions;
CREATE POLICY interactions_read_staff ON interactions FOR SELECT USING (
  user_has_crm_access() AND (is_staff_member_or_higher() OR user_id = current_user_id())
);
DROP POLICY IF EXISTS interactions_insert_staff ON interactions;
CREATE POLICY interactions_insert_staff ON interactions FOR INSERT WITH CHECK (
  is_staff_member_or_higher() AND (user_id IS NULL OR user_id = current_user_id())
);
DROP POLICY IF EXISTS interactions_update_author ON interactions;
CREATE POLICY interactions_update_author ON interactions FOR UPDATE USING (
  is_super_admin() OR user_id = current_user_id()
) WITH CHECK (
  is_super_admin() OR user_id = current_user_id()
);
DROP POLICY IF EXISTS interactions_delete_super_admin ON interactions;
CREATE POLICY interactions_delete_super_admin ON interactions FOR DELETE USING (is_super_admin());

-- --- 11. FUNDING RECORDS (Hidden from Volunteers & Unscoped Staff) ---
DROP POLICY IF EXISTS super_admin_all_funding ON funding_records;
CREATE POLICY super_admin_all_funding ON funding_records FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());
DROP POLICY IF EXISTS funding_authorized_view ON funding_records;
CREATE POLICY funding_authorized_view ON funding_records FOR SELECT USING (
  user_has_crm_access() AND (
    is_staff_manager_or_higher() OR 
    EXISTS (SELECT 1 FROM users u WHERE u.id = current_user_id() AND u.funding_scope IN ('ALL', 'VIEW'))
  )
);
DROP POLICY IF EXISTS funding_insert_manager ON funding_records;
CREATE POLICY funding_insert_manager ON funding_records FOR INSERT WITH CHECK (
  is_staff_manager_or_higher() OR 
  EXISTS (SELECT 1 FROM users u WHERE u.id = current_user_id() AND u.funding_scope = 'ALL')
);
DROP POLICY IF EXISTS funding_update_manager ON funding_records;
CREATE POLICY funding_update_manager ON funding_records FOR UPDATE USING (
  is_staff_manager_or_higher() OR 
  EXISTS (SELECT 1 FROM users u WHERE u.id = current_user_id() AND u.funding_scope = 'ALL')
) WITH CHECK (
  is_staff_manager_or_higher() OR 
  EXISTS (SELECT 1 FROM users u WHERE u.id = current_user_id() AND u.funding_scope = 'ALL')
);
DROP POLICY IF EXISTS funding_delete_super_admin ON funding_records;
CREATE POLICY funding_delete_super_admin ON funding_records FOR DELETE USING (is_super_admin());

-- --- 12. DOCUMENTS ---
DROP POLICY IF EXISTS documents_super_admin ON documents;
CREATE POLICY documents_super_admin ON documents FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());
DROP POLICY IF EXISTS documents_read_staff ON documents;
CREATE POLICY documents_read_staff ON documents FOR SELECT USING (
  user_has_crm_access() AND is_staff_member_or_higher()
);
DROP POLICY IF EXISTS documents_insert_staff ON documents;
CREATE POLICY documents_insert_staff ON documents FOR INSERT WITH CHECK (is_staff_member_or_higher());
DROP POLICY IF EXISTS documents_update_author ON documents;
CREATE POLICY documents_update_author ON documents FOR UPDATE USING (
  is_staff_manager_or_higher() OR added_by = current_user_id()
) WITH CHECK (
  is_staff_manager_or_higher() OR added_by = current_user_id()
);
DROP POLICY IF EXISTS documents_delete_manager ON documents;
CREATE POLICY documents_delete_manager ON documents FOR DELETE USING (is_staff_manager_or_higher());

-- --- 13. USER PROGRAM & EVENT SCOPING ACCESS TABLES ---
DROP POLICY IF EXISTS user_program_access_read ON user_program_access;
CREATE POLICY user_program_access_read ON user_program_access FOR SELECT USING (
  is_staff_manager_or_higher() OR user_id = current_user_id()
);
DROP POLICY IF EXISTS user_program_access_write ON user_program_access;
CREATE POLICY user_program_access_write ON user_program_access FOR ALL USING (is_staff_manager_or_higher()) WITH CHECK (is_staff_manager_or_higher());

DROP POLICY IF EXISTS user_event_access_read ON user_event_access;
CREATE POLICY user_event_access_read ON user_event_access FOR SELECT USING (
  is_staff_manager_or_higher() OR user_id = current_user_id()
);
DROP POLICY IF EXISTS user_event_access_write ON user_event_access;
CREATE POLICY user_event_access_write ON user_event_access FOR ALL USING (is_staff_manager_or_higher()) WITH CHECK (is_staff_manager_or_higher());

-- --- 14. AUDIT LOGS (Check 12: Strictly Immutable & Append-Only) ---
DROP POLICY IF EXISTS audit_logs_read_authorized ON audit_logs;
CREATE POLICY audit_logs_read_authorized ON audit_logs FOR SELECT USING (
  is_super_admin() OR is_staff_manager_or_higher()
);
DROP POLICY IF EXISTS audit_logs_insert_append ON audit_logs;
CREATE POLICY audit_logs_insert_append ON audit_logs FOR INSERT WITH CHECK (
  auth.role() IN ('authenticated', 'service_role') OR user_has_crm_access()
);
-- Note: Zero UPDATE or DELETE policies exist for audit_logs.

-- Step 5: Revoke default public execution privileges on administrative procedures
REVOKE EXECUTE ON FUNCTION purge_audit_logs_older_than(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION purge_audit_logs_older_than(INTEGER) TO authenticated;

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

-- Policies for analysis_files
DROP POLICY IF EXISTS analysis_files_super_admin ON analysis_files;
CREATE POLICY analysis_files_super_admin ON analysis_files FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());
DROP POLICY IF EXISTS analysis_files_read ON analysis_files;
DROP POLICY IF EXISTS analysis_files_insert ON analysis_files;
CREATE POLICY analysis_files_insert ON analysis_files FOR INSERT WITH CHECK (is_staff_member_or_higher() AND organization_id = current_user_org_id());
DROP POLICY IF EXISTS analysis_files_delete ON analysis_files;
CREATE POLICY analysis_files_delete ON analysis_files FOR DELETE USING (is_staff_manager_or_higher() AND organization_id = current_user_org_id());

-- Policies for analysis_jobs
DROP POLICY IF EXISTS super_admin_all_intelligence ON analysis_jobs;
CREATE POLICY super_admin_all_intelligence ON analysis_jobs FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());
DROP POLICY IF EXISTS staff_intelligence_access ON analysis_jobs;
CREATE POLICY staff_intelligence_access ON analysis_jobs FOR SELECT USING (user_has_crm_access() AND organization_id = current_user_org_id());
DROP POLICY IF EXISTS staff_intelligence_insert ON analysis_jobs;
CREATE POLICY staff_intelligence_insert ON analysis_jobs FOR INSERT WITH CHECK (is_staff_member_or_higher() AND organization_id = current_user_org_id());

-- Policies for analysis_results
DROP POLICY IF EXISTS analysis_results_super_admin ON analysis_results;
CREATE POLICY analysis_results_super_admin ON analysis_results FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());
DROP POLICY IF EXISTS analysis_results_read ON analysis_results;
CREATE POLICY analysis_results_read ON analysis_results FOR SELECT USING (
  user_has_crm_access() AND analysis_job_id IN (SELECT id FROM analysis_jobs WHERE organization_id = current_user_org_id())
);

-- Policies for analysis_metrics
DROP POLICY IF EXISTS analysis_metrics_super_admin ON analysis_metrics;
CREATE POLICY analysis_metrics_super_admin ON analysis_metrics FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());
DROP POLICY IF EXISTS analysis_metrics_read ON analysis_metrics;
CREATE POLICY analysis_metrics_read ON analysis_metrics FOR SELECT USING (user_has_crm_access());

-- Policies for analysis_insights
DROP POLICY IF EXISTS analysis_insights_super_admin ON analysis_insights;
CREATE POLICY analysis_insights_super_admin ON analysis_insights FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());
DROP POLICY IF EXISTS analysis_insights_read ON analysis_insights;
CREATE POLICY analysis_insights_read ON analysis_insights FOR SELECT USING (user_has_crm_access());

-- Policies for ai_requests
DROP POLICY IF EXISTS super_admin_ai_logs ON ai_requests;
CREATE POLICY super_admin_ai_logs ON ai_requests FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());
DROP POLICY IF EXISTS ai_requests_staff_insert ON ai_requests;
CREATE POLICY ai_requests_staff_insert ON ai_requests FOR INSERT WITH CHECK (user_has_crm_access() AND user_id = current_user_id());

-- Policies for ai_usage_logs
DROP POLICY IF EXISTS super_admin_ai_usage ON ai_usage_logs;
CREATE POLICY super_admin_ai_usage ON ai_usage_logs FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());
DROP POLICY IF EXISTS staff_ai_usage_read ON ai_usage_logs;
CREATE POLICY staff_ai_usage_read ON ai_usage_logs FOR SELECT USING (user_has_crm_access() AND organization_id = current_user_org_id());

-- ==============================================================================
-- 10. SUPABASE STORAGE BUCKETS & ACCESS POLICIES (Security Check 13)
-- ==============================================================================

-- 1. Register Private Storage Buckets
-- Buckets: crm_documents, crm_attachments, crm_backups (Strictly public = false)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  (
    'crm_documents', 
    'crm_documents', 
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
    'crm_attachments', 
    'crm_attachments', 
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

-- 2. Storage Row Level Security (RLS) Policies on storage.objects
DO $$
BEGIN
  ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
EXCEPTION
  WHEN insufficient_privilege THEN
    NULL;
END $$;

-- Policy: Documents & Attachments Read Scoping (Restricted to authorized roles; volunteers cannot read general documents)
DROP POLICY IF EXISTS storage_documents_read ON storage.objects;
CREATE POLICY storage_documents_read ON storage.objects
  FOR SELECT USING (
    bucket_id IN ('crm_documents', 'crm_attachments') AND (
      is_super_admin() OR EXISTS (
        SELECT 1 FROM users u
        JOIN user_roles ur ON ur.user_id = u.id
        WHERE u.auth_user_id = auth.uid()::text AND ur.role_id IN ('super_admin', 'staff_manager', 'staff_member')
      )
    )
  );

-- Policy: Documents & Attachments Upload (Restricted to staff with documents.create permission)
DROP POLICY IF EXISTS storage_documents_insert ON storage.objects;
CREATE POLICY storage_documents_insert ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id IN ('crm_documents', 'crm_attachments') AND (
      is_super_admin() OR EXISTS (
        SELECT 1 FROM users u
        JOIN user_roles ur ON ur.user_id = u.id
        WHERE u.auth_user_id = auth.uid()::text AND ur.role_id IN ('super_admin', 'staff_manager', 'staff_member')
      )
    )
  );

-- Policy: Documents & Attachments Deletion (Super Admin only)
DROP POLICY IF EXISTS storage_documents_delete ON storage.objects;
CREATE POLICY storage_documents_delete ON storage.objects
  FOR DELETE USING (
    bucket_id IN ('crm_documents', 'crm_attachments') AND is_super_admin()
  );

-- Policy: Database Backups (Strictly Restricted to Super Admin ONLY)
DROP POLICY IF EXISTS storage_backups_super_admin ON storage.objects;
CREATE POLICY storage_backups_super_admin ON storage.objects
  FOR ALL USING (
    bucket_id = 'crm_backups' AND is_super_admin()
  );

-- NOTE: Public and anonymous access to storage objects is unconditionally DENIED.


