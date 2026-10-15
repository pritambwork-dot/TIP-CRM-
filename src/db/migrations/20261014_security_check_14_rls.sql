-- ==============================================================================
-- Migration: 20261014_security_check_14_rls.sql
-- Description: Security Check 14 - Database Security & Row-Level Security (RLS) Hardening
-- Author: TIP CRM Engineering / Antigravity Security Check 14
-- Date: 2026-10-14
-- Safe & Non-Destructive: Idempotent (uses IF EXISTS / OR REPLACE / ON CONFLICT)
-- ==============================================================================

BEGIN;

-- ==============================================================================
-- 1. ENABLE ROW LEVEL SECURITY ACROSS ALL CRM & STORAGE TABLES (29 TABLES)
-- ==============================================================================

-- 1.1 Identity & RBAC Tables
ALTER TABLE IF EXISTS organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS access_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_program_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_event_access ENABLE ROW LEVEL SECURITY;

-- 1.2 CRM Core Tables
ALTER TABLE IF EXISTS people ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS program_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS program_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS event_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS funding_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS audit_logs ENABLE ROW LEVEL SECURITY;

-- 1.3 AI Intelligence & Analytics Tables
ALTER TABLE IF EXISTS analysis_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS analysis_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS analysis_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS analysis_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ai_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- 1.4 Supabase Storage Objects Table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'objects') THEN
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
  END IF;
EXCEPTION
  WHEN insufficient_privilege THEN
    NULL;
END $$;

-- ==============================================================================
-- 2. HARDEN SECURITY DEFINER FUNCTIONS (FIX SEARCH_PATH HIJACKING)
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
    WHERE auth_user_id = auth.uid()::text 
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
  WHERE auth_user_id = auth.uid()::text 
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
  WHERE auth_user_id = auth.uid()::text 
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
    WHERE u.auth_user_id = auth.uid()::text 
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
    WHERE u.auth_user_id = auth.uid()::text 
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
    WHERE u.auth_user_id = auth.uid()::text 
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
  WHERE auth_user_id = auth.uid()::text;
$$;

-- ==============================================================================
-- 3. DATABASE-ENFORCED SELF-ELEVATION PREVENTION TRIGGER
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.check_users_self_elevation()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Super Admin or Supabase internal service_role can perform administrative updates
  IF is_super_admin() OR auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Protect privileged columns from modification by regular users
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

DROP TRIGGER IF EXISTS trg_prevent_self_elevation_users ON public.users;
CREATE TRIGGER trg_prevent_self_elevation_users
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.check_users_self_elevation();

-- ==============================================================================
-- 4. GRANULAR, LEAST-PRIVILEGE ROW LEVEL SECURITY POLICIES
-- ==============================================================================

-- --- 4.1 ROLES, PERMISSIONS, ROLE_PERMISSIONS ---
DROP POLICY IF EXISTS roles_read_crm ON public.roles;
CREATE POLICY roles_read_crm ON public.roles FOR SELECT USING (user_has_crm_access());
DROP POLICY IF EXISTS roles_write_super_admin ON public.roles;
CREATE POLICY roles_write_super_admin ON public.roles FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS permissions_read_crm ON public.permissions;
CREATE POLICY permissions_read_crm ON public.permissions FOR SELECT USING (user_has_crm_access());
DROP POLICY IF EXISTS permissions_write_super_admin ON public.permissions;
CREATE POLICY permissions_write_super_admin ON public.permissions FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS role_permissions_read_crm ON public.role_permissions;
CREATE POLICY role_permissions_read_crm ON public.role_permissions FOR SELECT USING (user_has_crm_access());
DROP POLICY IF EXISTS role_permissions_write_super_admin ON public.role_permissions;
CREATE POLICY role_permissions_write_super_admin ON public.role_permissions FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

-- --- 4.2 USER ROLES (Blocks self-promotion) ---
DROP POLICY IF EXISTS user_roles_read_authorized ON public.user_roles;
CREATE POLICY user_roles_read_authorized ON public.user_roles FOR SELECT USING (
  is_super_admin() OR user_id = current_user_id() OR (user_has_crm_access() AND user_id IN (SELECT id FROM public.users WHERE organization_id = current_user_org_id()))
);
DROP POLICY IF EXISTS user_roles_write_super_admin ON public.user_roles;
CREATE POLICY user_roles_write_super_admin ON public.user_roles FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

-- --- 4.3 USERS ---
DROP POLICY IF EXISTS super_admin_all_users ON public.users;
CREATE POLICY super_admin_all_users ON public.users FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());
DROP POLICY IF EXISTS org_users_view ON public.users;
CREATE POLICY org_users_view ON public.users FOR SELECT USING (user_has_crm_access() AND organization_id = current_user_org_id());
DROP POLICY IF EXISTS users_self_update ON public.users;
CREATE POLICY users_self_update ON public.users FOR UPDATE USING (
  auth_user_id = auth.uid()::text AND user_has_crm_access()
) WITH CHECK (
  auth_user_id = auth.uid()::text
);

-- --- 4.4 ACCESS REQUESTS ---
DROP POLICY IF EXISTS super_admin_access_requests ON public.access_requests;
CREATE POLICY super_admin_access_requests ON public.access_requests FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());
DROP POLICY IF EXISTS own_access_request ON public.access_requests;
CREATE POLICY own_access_request ON public.access_requests FOR SELECT USING (auth_user_id = auth.uid()::text);
DROP POLICY IF EXISTS insert_access_request ON public.access_requests;
CREATE POLICY insert_access_request ON public.access_requests FOR INSERT WITH CHECK (auth_user_id = auth.uid()::text);

-- --- 4.5 ORGANIZATIONS ---
DROP POLICY IF EXISTS organizations_super_admin ON public.organizations;
CREATE POLICY organizations_super_admin ON public.organizations FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());
DROP POLICY IF EXISTS organizations_read_crm ON public.organizations;
CREATE POLICY organizations_read_crm ON public.organizations FOR SELECT USING (user_has_crm_access());
DROP POLICY IF EXISTS organizations_update_manager ON public.organizations;
CREATE POLICY organizations_update_manager ON public.organizations FOR UPDATE USING (
  is_staff_manager_or_higher() AND id = current_user_org_id()
) WITH CHECK (
  id = current_user_org_id()
);

-- --- 4.6 PEOPLE (Contacts Directory) ---
DROP POLICY IF EXISTS super_admin_all_people ON public.people;
CREATE POLICY super_admin_all_people ON public.people FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());
DROP POLICY IF EXISTS people_read_scoped ON public.people;
CREATE POLICY people_read_scoped ON public.people FOR SELECT USING (
  user_has_crm_access() AND (
    is_staff_manager_or_higher() OR 
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = current_user_id() AND u.people_scope = 'GLOBAL') OR
    organization_id = current_user_org_id() OR
    id IN (
      SELECT person_id FROM public.program_participants WHERE program_id IN (SELECT program_id FROM public.user_program_access WHERE user_id = current_user_id())
      UNION
      SELECT person_id FROM public.event_participants WHERE event_id IN (SELECT event_id FROM public.user_event_access WHERE user_id = current_user_id())
    ) OR
    created_by = current_user_id()
  )
);
DROP POLICY IF EXISTS people_insert_staff ON public.people;
CREATE POLICY people_insert_staff ON public.people FOR INSERT WITH CHECK (
  is_staff_member_or_higher() AND (organization_id IS NULL OR organization_id = current_user_org_id())
);
DROP POLICY IF EXISTS people_update_staff ON public.people;
CREATE POLICY people_update_staff ON public.people FOR UPDATE USING (
  is_staff_member_or_higher() AND (organization_id IS NULL OR organization_id = current_user_org_id())
) WITH CHECK (
  organization_id IS NULL OR organization_id = current_user_org_id()
);
DROP POLICY IF EXISTS people_delete_manager ON public.people;
CREATE POLICY people_delete_manager ON public.people FOR DELETE USING (
  is_staff_manager_or_higher() AND (organization_id IS NULL OR organization_id = current_user_org_id())
);

-- --- 4.7 PROGRAMS & PROGRAM MEMBERS/PARTICIPANTS ---
DROP POLICY IF EXISTS super_admin_all_programs ON public.programs;
CREATE POLICY super_admin_all_programs ON public.programs FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());
DROP POLICY IF EXISTS programs_scoped_view ON public.programs;
CREATE POLICY programs_scoped_view ON public.programs FOR SELECT USING (
  user_has_crm_access() AND (
    is_staff_manager_or_higher() OR 
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = current_user_id() AND u.programs_scope = 'ALL') OR
    id IN (SELECT program_id FROM public.user_program_access WHERE user_id = current_user_id()) OR
    id IN (SELECT program_id FROM public.program_members WHERE user_id = current_user_id())
  )
);
DROP POLICY IF EXISTS programs_insert_manager ON public.programs;
CREATE POLICY programs_insert_manager ON public.programs FOR INSERT WITH CHECK (is_staff_manager_or_higher());
DROP POLICY IF EXISTS programs_update_manager ON public.programs;
CREATE POLICY programs_update_manager ON public.programs FOR UPDATE USING (
  is_staff_manager_or_higher() OR owner_id = current_user_id()
) WITH CHECK (
  is_staff_manager_or_higher() OR owner_id = current_user_id()
);
DROP POLICY IF EXISTS programs_delete_super_admin ON public.programs;
CREATE POLICY programs_delete_super_admin ON public.programs FOR DELETE USING (is_super_admin());

DROP POLICY IF EXISTS program_members_read ON public.program_members;
CREATE POLICY program_members_read ON public.program_members FOR SELECT USING (user_has_crm_access());
DROP POLICY IF EXISTS program_members_write_manager ON public.program_members;
CREATE POLICY program_members_write_manager ON public.program_members FOR ALL USING (is_staff_manager_or_higher()) WITH CHECK (is_staff_manager_or_higher());

DROP POLICY IF EXISTS program_participants_read ON public.program_participants;
CREATE POLICY program_participants_read ON public.program_participants FOR SELECT USING (user_has_crm_access());
DROP POLICY IF EXISTS program_participants_write_staff ON public.program_participants;
CREATE POLICY program_participants_write_staff ON public.program_participants FOR ALL USING (is_staff_member_or_higher()) WITH CHECK (is_staff_member_or_higher());

-- --- 4.8 EVENTS, EVENT STAFF & PARTICIPANTS ---
DROP POLICY IF EXISTS super_admin_all_events ON public.events;
CREATE POLICY super_admin_all_events ON public.events FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());
DROP POLICY IF EXISTS events_read_scoped ON public.events;
CREATE POLICY events_read_scoped ON public.events FOR SELECT USING (
  user_has_crm_access() AND (
    is_staff_manager_or_higher() OR 
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = current_user_id() AND u.events_scope = 'ALL') OR
    id IN (SELECT event_id FROM public.user_event_access WHERE user_id = current_user_id()) OR
    id IN (SELECT event_id FROM public.event_staff WHERE user_id = current_user_id())
  )
);
DROP POLICY IF EXISTS events_insert_staff ON public.events;
CREATE POLICY events_insert_staff ON public.events FOR INSERT WITH CHECK (is_staff_member_or_higher());
DROP POLICY IF EXISTS events_update_staff ON public.events;
CREATE POLICY events_update_staff ON public.events FOR UPDATE USING (
  is_staff_manager_or_higher() OR facilitator_id = current_user_id()
) WITH CHECK (
  is_staff_manager_or_higher() OR facilitator_id = current_user_id()
);
DROP POLICY IF EXISTS events_delete_manager ON public.events;
CREATE POLICY events_delete_manager ON public.events FOR DELETE USING (is_staff_manager_or_higher());

DROP POLICY IF EXISTS event_staff_read ON public.event_staff;
CREATE POLICY event_staff_read ON public.event_staff FOR SELECT USING (user_has_crm_access());
DROP POLICY IF EXISTS event_staff_write_manager ON public.event_staff;
CREATE POLICY event_staff_write_manager ON public.event_staff FOR ALL USING (is_staff_manager_or_higher()) WITH CHECK (is_staff_manager_or_higher());

DROP POLICY IF EXISTS event_participants_read ON public.event_participants;
CREATE POLICY event_participants_read ON public.event_participants FOR SELECT USING (user_has_crm_access());
DROP POLICY IF EXISTS event_participants_write_staff ON public.event_participants;
CREATE POLICY event_participants_write_staff ON public.event_participants FOR ALL USING (is_staff_member_or_higher()) WITH CHECK (is_staff_member_or_higher());

-- --- 4.9 TASKS ---
DROP POLICY IF EXISTS tasks_super_admin ON public.tasks;
CREATE POLICY tasks_super_admin ON public.tasks FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());
DROP POLICY IF EXISTS tasks_read_scoped ON public.tasks;
CREATE POLICY tasks_read_scoped ON public.tasks FOR SELECT USING (
  user_has_crm_access() AND (
    is_staff_manager_or_higher() OR assigned_to = current_user_id() OR created_by = current_user_id()
  )
);
DROP POLICY IF EXISTS tasks_insert_staff ON public.tasks;
CREATE POLICY tasks_insert_staff ON public.tasks FOR INSERT WITH CHECK (
  is_staff_member_or_higher() AND (created_by IS NULL OR created_by = current_user_id())
);
DROP POLICY IF EXISTS tasks_update_staff ON public.tasks;
CREATE POLICY tasks_update_staff ON public.tasks FOR UPDATE USING (
  is_staff_manager_or_higher() OR assigned_to = current_user_id() OR created_by = current_user_id()
) WITH CHECK (
  is_staff_manager_or_higher() OR assigned_to = current_user_id() OR created_by = current_user_id()
);
DROP POLICY IF EXISTS tasks_delete_manager ON public.tasks;
CREATE POLICY tasks_delete_manager ON public.tasks FOR DELETE USING (
  is_staff_manager_or_higher() OR created_by = current_user_id()
);

-- --- 4.10 INTERACTIONS ---
DROP POLICY IF EXISTS interactions_super_admin ON public.interactions;
CREATE POLICY interactions_super_admin ON public.interactions FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());
DROP POLICY IF EXISTS interactions_read_staff ON public.interactions;
CREATE POLICY interactions_read_staff ON public.interactions FOR SELECT USING (
  user_has_crm_access() AND (is_staff_member_or_higher() OR user_id = current_user_id())
);
DROP POLICY IF EXISTS interactions_insert_staff ON public.interactions;
CREATE POLICY interactions_insert_staff ON public.interactions FOR INSERT WITH CHECK (
  is_staff_member_or_higher() AND (user_id IS NULL OR user_id = current_user_id())
);
DROP POLICY IF EXISTS interactions_update_author ON public.interactions;
CREATE POLICY interactions_update_author ON public.interactions FOR UPDATE USING (
  is_super_admin() OR user_id = current_user_id()
) WITH CHECK (
  is_super_admin() OR user_id = current_user_id()
);
DROP POLICY IF EXISTS interactions_delete_super_admin ON public.interactions;
CREATE POLICY interactions_delete_super_admin ON public.interactions FOR DELETE USING (is_super_admin());

-- --- 4.11 FUNDING RECORDS (Hidden from Volunteers & Unscoped Staff) ---
DROP POLICY IF EXISTS super_admin_all_funding ON public.funding_records;
CREATE POLICY super_admin_all_funding ON public.funding_records FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());
DROP POLICY IF EXISTS funding_authorized_view ON public.funding_records;
CREATE POLICY funding_authorized_view ON public.funding_records FOR SELECT USING (
  user_has_crm_access() AND (
    is_staff_manager_or_higher() OR 
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = current_user_id() AND u.funding_scope IN ('ALL', 'VIEW'))
  )
);
DROP POLICY IF EXISTS funding_insert_manager ON public.funding_records;
CREATE POLICY funding_insert_manager ON public.funding_records FOR INSERT WITH CHECK (
  is_staff_manager_or_higher() OR 
  EXISTS (SELECT 1 FROM public.users u WHERE u.id = current_user_id() AND u.funding_scope = 'ALL')
);
DROP POLICY IF EXISTS funding_update_manager ON public.funding_records;
CREATE POLICY funding_update_manager ON public.funding_records FOR UPDATE USING (
  is_staff_manager_or_higher() OR 
  EXISTS (SELECT 1 FROM public.users u WHERE u.id = current_user_id() AND u.funding_scope = 'ALL')
) WITH CHECK (
  is_staff_manager_or_higher() OR 
  EXISTS (SELECT 1 FROM public.users u WHERE u.id = current_user_id() AND u.funding_scope = 'ALL')
);
DROP POLICY IF EXISTS funding_delete_super_admin ON public.funding_records;
CREATE POLICY funding_delete_super_admin ON public.funding_records FOR DELETE USING (is_super_admin());

-- --- 4.12 DOCUMENTS ---
DROP POLICY IF EXISTS documents_super_admin ON public.documents;
CREATE POLICY documents_super_admin ON public.documents FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());
DROP POLICY IF EXISTS documents_read_staff ON public.documents;
CREATE POLICY documents_read_staff ON public.documents FOR SELECT USING (
  user_has_crm_access() AND is_staff_member_or_higher()
);
DROP POLICY IF EXISTS documents_insert_staff ON public.documents;
CREATE POLICY documents_insert_staff ON public.documents FOR INSERT WITH CHECK (is_staff_member_or_higher());
DROP POLICY IF EXISTS documents_update_author ON public.documents;
CREATE POLICY documents_update_author ON public.documents FOR UPDATE USING (
  is_staff_manager_or_higher() OR added_by = current_user_id()
) WITH CHECK (
  is_staff_manager_or_higher() OR added_by = current_user_id()
);
DROP POLICY IF EXISTS documents_delete_manager ON public.documents;
CREATE POLICY documents_delete_manager ON public.documents FOR DELETE USING (is_staff_manager_or_higher());

-- --- 4.13 USER SCOPING ACCESS TABLES ---
DROP POLICY IF EXISTS user_program_access_read ON public.user_program_access;
CREATE POLICY user_program_access_read ON public.user_program_access FOR SELECT USING (
  is_staff_manager_or_higher() OR user_id = current_user_id()
);
DROP POLICY IF EXISTS user_program_access_write ON public.user_program_access;
CREATE POLICY user_program_access_write ON public.user_program_access FOR ALL USING (is_staff_manager_or_higher()) WITH CHECK (is_staff_manager_or_higher());

DROP POLICY IF EXISTS user_event_access_read ON public.user_event_access;
CREATE POLICY user_event_access_read ON public.user_event_access FOR SELECT USING (
  is_staff_manager_or_higher() OR user_id = current_user_id()
);
DROP POLICY IF EXISTS user_event_access_write ON public.user_event_access;
CREATE POLICY user_event_access_write ON public.user_event_access FOR ALL USING (is_staff_manager_or_higher()) WITH CHECK (is_staff_manager_or_higher());

-- --- 4.14 AUDIT LOGS (Immutable & Append-Only) ---
DROP POLICY IF EXISTS audit_logs_read_authorized ON public.audit_logs;
CREATE POLICY audit_logs_read_authorized ON public.audit_logs FOR SELECT USING (
  is_super_admin() OR is_staff_manager_or_higher()
);
DROP POLICY IF EXISTS audit_logs_insert_append ON public.audit_logs;
CREATE POLICY audit_logs_insert_append ON public.audit_logs FOR INSERT WITH CHECK (
  auth.role() IN ('authenticated', 'service_role') OR user_has_crm_access()
);
-- Note: Zero UPDATE or DELETE policies exist for audit_logs.

-- --- 4.15 AI INTELLIGENCE & CSV ANALYTICS ---
DROP POLICY IF EXISTS analysis_files_super_admin ON public.analysis_files;
CREATE POLICY analysis_files_super_admin ON public.analysis_files FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());
DROP POLICY IF EXISTS analysis_files_read ON public.analysis_files;
CREATE POLICY analysis_files_read ON public.analysis_files FOR SELECT USING (user_has_crm_access() AND organization_id = current_user_org_id());
DROP POLICY IF EXISTS analysis_files_insert ON public.analysis_files;
CREATE POLICY analysis_files_insert ON public.analysis_files FOR INSERT WITH CHECK (is_staff_member_or_higher() AND organization_id = current_user_org_id());
DROP POLICY IF EXISTS analysis_files_delete ON public.analysis_files;
CREATE POLICY analysis_files_delete ON public.analysis_files FOR DELETE USING (is_staff_manager_or_higher() AND organization_id = current_user_org_id());

DROP POLICY IF EXISTS super_admin_all_intelligence ON public.analysis_jobs;
CREATE POLICY super_admin_all_intelligence ON public.analysis_jobs FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());
DROP POLICY IF EXISTS staff_intelligence_access ON public.analysis_jobs;
CREATE POLICY staff_intelligence_access ON public.analysis_jobs FOR SELECT USING (user_has_crm_access() AND organization_id = current_user_org_id());
DROP POLICY IF EXISTS staff_intelligence_insert ON public.analysis_jobs;
CREATE POLICY staff_intelligence_insert ON public.analysis_jobs FOR INSERT WITH CHECK (is_staff_member_or_higher() AND organization_id = current_user_org_id());

DROP POLICY IF EXISTS analysis_results_super_admin ON public.analysis_results;
CREATE POLICY analysis_results_super_admin ON public.analysis_results FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());
DROP POLICY IF EXISTS analysis_results_read ON public.analysis_results;
CREATE POLICY analysis_results_read ON public.analysis_results FOR SELECT USING (
  user_has_crm_access() AND analysis_job_id IN (SELECT id FROM public.analysis_jobs WHERE organization_id = current_user_org_id())
);

DROP POLICY IF EXISTS analysis_metrics_super_admin ON public.analysis_metrics;
CREATE POLICY analysis_metrics_super_admin ON public.analysis_metrics FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());
DROP POLICY IF EXISTS analysis_metrics_read ON public.analysis_metrics;
CREATE POLICY analysis_metrics_read ON public.analysis_metrics FOR SELECT USING (user_has_crm_access());

DROP POLICY IF EXISTS analysis_insights_super_admin ON public.analysis_insights;
CREATE POLICY analysis_insights_super_admin ON public.analysis_insights FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());
DROP POLICY IF EXISTS analysis_insights_read ON public.analysis_insights;
CREATE POLICY analysis_insights_read ON public.analysis_insights FOR SELECT USING (user_has_crm_access());

DROP POLICY IF EXISTS super_admin_ai_logs ON public.ai_requests;
CREATE POLICY super_admin_ai_logs ON public.ai_requests FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());
DROP POLICY IF EXISTS ai_requests_staff_insert ON public.ai_requests;
CREATE POLICY ai_requests_staff_insert ON public.ai_requests FOR INSERT WITH CHECK (user_has_crm_access() AND user_id = current_user_id());

DROP POLICY IF EXISTS super_admin_ai_usage ON public.ai_usage_logs;
CREATE POLICY super_admin_ai_usage ON public.ai_usage_logs FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());
DROP POLICY IF EXISTS staff_ai_usage_read ON public.ai_usage_logs;
CREATE POLICY staff_ai_usage_read ON public.ai_usage_logs FOR SELECT USING (user_has_crm_access() AND organization_id = current_user_org_id());

-- --- 4.16 SUPABASE STORAGE OBJECT POLICIES ---
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'objects') THEN
    EXECUTE '
      DROP POLICY IF EXISTS storage_documents_read ON storage.objects;
      CREATE POLICY storage_documents_read ON storage.objects
        FOR SELECT USING (
          bucket_id IN (''crm_documents'', ''crm_attachments'') AND (
            is_super_admin() OR EXISTS (
              SELECT 1 FROM public.users u
              JOIN public.user_roles ur ON ur.user_id = u.id
              WHERE u.auth_user_id = auth.uid()::text AND ur.role_id IN (''super_admin'', ''staff_manager'', ''staff_member'')
            )
          )
        );

      DROP POLICY IF EXISTS storage_documents_insert ON storage.objects;
      CREATE POLICY storage_documents_insert ON storage.objects
        FOR INSERT WITH CHECK (
          bucket_id IN (''crm_documents'', ''crm_attachments'') AND (
            is_super_admin() OR EXISTS (
              SELECT 1 FROM public.users u
              JOIN public.user_roles ur ON ur.user_id = u.id
              WHERE u.auth_user_id = auth.uid()::text AND ur.role_id IN (''super_admin'', ''staff_manager'', ''staff_member'')
            )
          )
        );

      DROP POLICY IF EXISTS storage_documents_delete ON storage.objects;
      CREATE POLICY storage_documents_delete ON storage.objects
        FOR DELETE USING (
          bucket_id IN (''crm_documents'', ''crm_attachments'') AND is_super_admin()
        );

      DROP POLICY IF EXISTS storage_backups_super_admin ON storage.objects;
      CREATE POLICY storage_backups_super_admin ON storage.objects
        FOR ALL USING (
          bucket_id = ''crm_backups'' AND is_super_admin()
        );
    ';
  END IF;
END $$;

-- ==============================================================================
-- 5. FUNCTION PRIVILEGE HARDENING
-- ==============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'purge_audit_logs_older_than') THEN
    REVOKE EXECUTE ON FUNCTION purge_audit_logs_older_than(INTEGER) FROM PUBLIC;
    GRANT EXECUTE ON FUNCTION purge_audit_logs_older_than(INTEGER) TO authenticated;
  END IF;
END $$;

COMMIT;

-- ==============================================================================
-- ROLLBACK INSTRUCTIONS (NON-DESTRUCTIVE)
-- ==============================================================================
-- To revert the policies applied in this migration without altering underlying tables or data:
--
-- 1. DROP POLICIES:
--    DROP POLICY IF EXISTS roles_read_crm ON public.roles;
--    DROP POLICY IF EXISTS roles_write_super_admin ON public.roles;
--    DROP POLICY IF EXISTS permissions_read_crm ON public.permissions;
--    DROP POLICY IF EXISTS permissions_write_super_admin ON public.permissions;
--    DROP POLICY IF EXISTS role_permissions_read_crm ON public.role_permissions;
--    DROP POLICY IF EXISTS role_permissions_write_super_admin ON public.role_permissions;
--    DROP POLICY IF EXISTS user_roles_read_authorized ON public.user_roles;
--    DROP POLICY IF EXISTS user_roles_write_super_admin ON public.user_roles;
--    DROP POLICY IF EXISTS super_admin_all_users ON public.users;
--    DROP POLICY IF EXISTS org_users_view ON public.users;
--    DROP POLICY IF EXISTS users_self_update ON public.users;
--    DROP POLICY IF EXISTS super_admin_access_requests ON public.access_requests;
--    DROP POLICY IF EXISTS own_access_request ON public.access_requests;
--    DROP POLICY IF EXISTS insert_access_request ON public.access_requests;
--    DROP POLICY IF EXISTS organizations_super_admin ON public.organizations;
--    DROP POLICY IF EXISTS organizations_read_crm ON public.organizations;
--    DROP POLICY IF EXISTS organizations_update_manager ON public.organizations;
--    DROP POLICY IF EXISTS super_admin_all_people ON public.people;
--    DROP POLICY IF EXISTS people_read_scoped ON public.people;
--    DROP POLICY IF EXISTS people_insert_staff ON public.people;
--    DROP POLICY IF EXISTS people_update_staff ON public.people;
--    DROP POLICY IF EXISTS people_delete_manager ON public.people;
--    DROP POLICY IF EXISTS super_admin_all_programs ON public.programs;
--    DROP POLICY IF EXISTS programs_scoped_view ON public.programs;
--    DROP POLICY IF EXISTS programs_insert_manager ON public.programs;
--    DROP POLICY IF EXISTS programs_update_manager ON public.programs;
--    DROP POLICY IF EXISTS programs_delete_super_admin ON public.programs;
--    DROP POLICY IF EXISTS program_members_read ON public.program_members;
--    DROP POLICY IF EXISTS program_members_write_manager ON public.program_members;
--    DROP POLICY IF EXISTS program_participants_read ON public.program_participants;
--    DROP POLICY IF EXISTS program_participants_write_staff ON public.program_participants;
--    DROP POLICY IF EXISTS super_admin_all_events ON public.events;
--    DROP POLICY IF EXISTS events_read_scoped ON public.events;
--    DROP POLICY IF EXISTS events_insert_staff ON public.events;
--    DROP POLICY IF EXISTS events_update_staff ON public.events;
--    DROP POLICY IF EXISTS events_delete_manager ON public.events;
--    DROP POLICY IF EXISTS event_staff_read ON public.event_staff;
--    DROP POLICY IF EXISTS event_staff_write_manager ON public.event_staff;
--    DROP POLICY IF EXISTS event_participants_read ON public.event_participants;
--    DROP POLICY IF EXISTS event_participants_write_staff ON public.event_participants;
--    DROP POLICY IF EXISTS tasks_super_admin ON public.tasks;
--    DROP POLICY IF EXISTS tasks_read_scoped ON public.tasks;
--    DROP POLICY IF EXISTS tasks_insert_staff ON public.tasks;
--    DROP POLICY IF EXISTS tasks_update_staff ON public.tasks;
--    DROP POLICY IF EXISTS tasks_delete_manager ON public.tasks;
--    DROP POLICY IF EXISTS interactions_super_admin ON public.interactions;
--    DROP POLICY IF EXISTS interactions_read_staff ON public.interactions;
--    DROP POLICY IF EXISTS interactions_insert_staff ON public.interactions;
--    DROP POLICY IF EXISTS interactions_update_author ON public.interactions;
--    DROP POLICY IF EXISTS interactions_delete_super_admin ON public.interactions;
--    DROP POLICY IF EXISTS super_admin_all_funding ON public.funding_records;
--    DROP POLICY IF EXISTS funding_authorized_view ON public.funding_records;
--    DROP POLICY IF EXISTS funding_insert_manager ON public.funding_records;
--    DROP POLICY IF EXISTS funding_update_manager ON public.funding_records;
--    DROP POLICY IF EXISTS funding_delete_super_admin ON public.funding_records;
--    DROP POLICY IF EXISTS documents_super_admin ON public.documents;
--    DROP POLICY IF EXISTS documents_read_staff ON public.documents;
--    DROP POLICY IF EXISTS documents_insert_staff ON public.documents;
--    DROP POLICY IF EXISTS documents_update_author ON public.documents;
--    DROP POLICY IF EXISTS documents_delete_manager ON public.documents;
--    DROP POLICY IF EXISTS user_program_access_read ON public.user_program_access;
--    DROP POLICY IF EXISTS user_program_access_write ON public.user_program_access;
--    DROP POLICY IF EXISTS user_event_access_read ON public.user_event_access;
--    DROP POLICY IF EXISTS user_event_access_write ON public.user_event_access;
--    DROP POLICY IF EXISTS audit_logs_read_authorized ON public.audit_logs;
--    DROP POLICY IF EXISTS audit_logs_insert_append ON public.audit_logs;
--    DROP POLICY IF EXISTS analysis_files_super_admin ON public.analysis_files;
--    DROP POLICY IF EXISTS analysis_files_read ON public.analysis_files;
--    DROP POLICY IF EXISTS analysis_files_insert ON public.analysis_files;
--    DROP POLICY IF EXISTS analysis_files_delete ON public.analysis_files;
--    DROP POLICY IF EXISTS super_admin_all_intelligence ON public.analysis_jobs;
--    DROP POLICY IF EXISTS staff_intelligence_access ON public.analysis_jobs;
--    DROP POLICY IF EXISTS staff_intelligence_insert ON public.analysis_jobs;
--    DROP POLICY IF EXISTS analysis_results_super_admin ON public.analysis_results;
--    DROP POLICY IF EXISTS analysis_results_read ON public.analysis_results;
--    DROP POLICY IF EXISTS analysis_metrics_super_admin ON public.analysis_metrics;
--    DROP POLICY IF EXISTS analysis_metrics_read ON public.analysis_metrics;
--    DROP POLICY IF EXISTS analysis_insights_super_admin ON public.analysis_insights;
--    DROP POLICY IF EXISTS analysis_insights_read ON public.analysis_insights;
--    DROP POLICY IF EXISTS super_admin_ai_logs ON public.ai_requests;
--    DROP POLICY IF EXISTS ai_requests_staff_insert ON public.ai_requests;
--    DROP POLICY IF EXISTS super_admin_ai_usage ON public.ai_usage_logs;
--    DROP POLICY IF EXISTS staff_ai_usage_read ON public.ai_usage_logs;
--    DROP POLICY IF EXISTS storage_documents_read ON storage.objects;
--    DROP POLICY IF EXISTS storage_documents_insert ON storage.objects;
--    DROP POLICY IF EXISTS storage_documents_delete ON storage.objects;
--    DROP POLICY IF EXISTS storage_backups_super_admin ON storage.objects;
--
-- 2. DROP ANTI-ELEVATION TRIGGER:
--    DROP TRIGGER IF EXISTS trg_prevent_self_elevation_users ON public.users;
--    DROP FUNCTION IF EXISTS public.check_users_self_elevation();
--
-- 3. (OPTIONAL) DISABLE RLS IF ROLLING BACK ENTIRE ACCESS CONTROL:
--    ALTER TABLE public.organizations DISABLE ROW LEVEL SECURITY;
--    ...
-- ==============================================================================
