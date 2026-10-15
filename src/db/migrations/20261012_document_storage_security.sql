-- ==============================================================================
-- TIP CRM — Database Migration: Document Security, Storage & Private Buckets
-- Migration ID: 20261012_document_storage_security
-- Organization: The Inclusion Project (TIP)
-- ==============================================================================

-- 1. Extend `documents` table with security and storage metadata
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS storage_path VARCHAR(500),
  ADD COLUMN IF NOT EXISTS storage_bucket VARCHAR(100) DEFAULT 'tip-crm-private-documents',
  ADD COLUMN IF NOT EXISTS file_size BIGINT,
  ADD COLUMN IF NOT EXISTS mime_type VARCHAR(100),
  ADD COLUMN IF NOT EXISTS is_confidential BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS access_tier VARCHAR(50) DEFAULT 'all', -- 'all', 'staff', 'management', 'super_admin'
  ADD COLUMN IF NOT EXISTS checksum VARCHAR(64),
  ADD COLUMN IF NOT EXISTS is_direct_upload BOOLEAN DEFAULT FALSE;

-- 2. Create the private storage bucket in Supabase Storage schema
-- Private by default: public = FALSE
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tip-crm-private-documents',
  'tip-crm-private-documents',
  FALSE,
  10485760, -- 10 MB limit
  ARRAY[
    'application/pdf',
    'text/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/png',
    'image/jpeg',
    'image/webp'
  ]
)
ON CONFLICT (id) DO UPDATE SET 
  public = FALSE, 
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY[
    'application/pdf',
    'text/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/png',
    'image/jpeg',
    'image/webp'
  ];

-- 3. Replace overly permissive document RLS policies with role-aware and confidentiality-aware controls
DROP POLICY IF EXISTS documents_scoped_view ON public.documents;
DROP POLICY IF EXISTS documents_staff_manage ON public.documents;
DROP POLICY IF EXISTS super_admin_all_documents ON public.documents;

-- Super Admin can manage all documents without restriction
CREATE POLICY super_admin_all_documents ON public.documents
  FOR ALL USING (is_super_admin());

-- Staff & Managers View Policy:
-- - super_admin and staff_manager can view all documents (including confidential)
-- - staff_member can view documents if is_confidential is FALSE, or if access_tier is 'staff' / 'all'
-- - volunteer can view only non-confidential documents where access_tier is 'all'
CREATE POLICY documents_role_governed_view ON public.documents
  FOR SELECT USING (
    user_has_crm_access() AND (
      -- Executive & Management access
      EXISTS (
        SELECT 1 FROM users u
        JOIN user_roles ur ON ur.user_id = u.id
        WHERE u.auth_user_id = auth.uid()::text 
          AND ur.role_id IN ('super_admin', 'staff_manager')
      )
      OR
      -- Staff Members: non-confidential or general staff tier
      (
        EXISTS (
          SELECT 1 FROM users u
          JOIN user_roles ur ON ur.user_id = u.id
          WHERE u.auth_user_id = auth.uid()::text 
            AND ur.role_id = 'staff_member'
        )
        AND (is_confidential = FALSE OR access_tier IN ('all', 'staff'))
      )
      OR
      -- Volunteers: only public/general non-confidential documents
      (
        EXISTS (
          SELECT 1 FROM users u
          JOIN user_roles ur ON ur.user_id = u.id
          WHERE u.auth_user_id = auth.uid()::text 
            AND ur.role_id = 'volunteer'
        )
        AND is_confidential = FALSE 
        AND access_tier = 'all'
      )
    )
  );

-- Staff Document Management Policy:
-- Only super_admin, staff_manager, and staff_member can insert documents
CREATE POLICY documents_staff_insert ON public.documents
  FOR INSERT WITH CHECK (
    user_has_crm_access() AND EXISTS (
      SELECT 1 FROM users u
      JOIN user_roles ur ON ur.user_id = u.id
      WHERE u.auth_user_id = auth.uid()::text 
        AND ur.role_id IN ('super_admin', 'staff_manager', 'staff_member')
    )
  );

-- Staff Document Update/Delete Policy:
-- Only super_admin, staff_manager, or the document uploader can update or delete
CREATE POLICY documents_owner_or_manager_modify ON public.documents
  FOR UPDATE USING (
    user_has_crm_access() AND (
      is_super_admin() OR
      added_by = (SELECT id FROM users WHERE auth_user_id = auth.uid()::text) OR
      EXISTS (
        SELECT 1 FROM users u
        JOIN user_roles ur ON ur.user_id = u.id
        WHERE u.auth_user_id = auth.uid()::text AND ur.role_id = 'staff_manager'
      )
    )
  );

CREATE POLICY documents_owner_or_manager_delete ON public.documents
  FOR DELETE USING (
    user_has_crm_access() AND (
      is_super_admin() OR
      added_by = (SELECT id FROM users WHERE auth_user_id = auth.uid()::text) OR
      EXISTS (
        SELECT 1 FROM users u
        JOIN user_roles ur ON ur.user_id = u.id
        WHERE u.auth_user_id = auth.uid()::text AND ur.role_id = 'staff_manager'
      )
    )
  );

-- 4. Supabase Storage RLS Policies (storage.objects table)
-- Enforce authorization directly on storage objects so knowledge of an object path does not bypass security.

-- Storage Object SELECT (Download / Signed URL Generation)
DROP POLICY IF EXISTS "tip_storage_private_select" ON storage.objects;
CREATE POLICY "tip_storage_private_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'tip-crm-private-documents' AND (
      -- Super Admin and Staff Manager can read all files
      is_super_admin() OR
      EXISTS (
        SELECT 1 FROM users u
        JOIN user_roles ur ON ur.user_id = u.id
        WHERE u.auth_user_id = auth.uid()::text AND ur.role_id IN ('super_admin', 'staff_manager')
      ) OR
      -- Check corresponding document metadata record in public.documents
      EXISTS (
        SELECT 1 FROM public.documents d
        WHERE d.storage_path = name
          AND (d.is_confidential = FALSE OR d.access_tier IN ('all', 'staff'))
      )
    )
  );

-- Storage Object INSERT (Direct Upload)
DROP POLICY IF EXISTS "tip_storage_private_insert" ON storage.objects;
CREATE POLICY "tip_storage_private_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'tip-crm-private-documents' AND
    user_has_crm_access() AND
    EXISTS (
      SELECT 1 FROM users u
      JOIN user_roles ur ON ur.user_id = u.id
      WHERE u.auth_user_id = auth.uid()::text 
        AND ur.role_id IN ('super_admin', 'staff_manager', 'staff_member')
    )
  );

-- Storage Object DELETE
DROP POLICY IF EXISTS "tip_storage_private_delete" ON storage.objects;
CREATE POLICY "tip_storage_private_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'tip-crm-private-documents' AND (
      is_super_admin() OR
      owner = auth.uid() OR
      EXISTS (
        SELECT 1 FROM users u
        JOIN user_roles ur ON ur.user_id = u.id
        WHERE u.auth_user_id = auth.uid()::text AND ur.role_id = 'staff_manager'
      )
    )
  );
