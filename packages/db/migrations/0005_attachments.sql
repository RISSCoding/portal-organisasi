-- SPDX-License-Identifier: AGPL-3.0-or-later
-- File Upload / Attachments table
CREATE TABLE attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE,
  uploaded_by_user_id uuid NOT NULL REFERENCES users(id),
  file_name text NOT NULL,
  mime_type text NOT NULL,
  file_size integer NOT NULL,
  storage_key text NOT NULL, -- S3 object key
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT attachments_target_check CHECK (
    (task_id IS NOT NULL AND document_id IS NULL) OR
    (task_id IS NULL AND document_id IS NOT NULL)
  )
);

CREATE INDEX attachments_org_idx ON attachments (organization_id);
CREATE INDEX attachments_task_idx ON attachments (organization_id, task_id);
CREATE INDEX attachments_document_idx ON attachments (organization_id, document_id);

-- RLS
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY attachments_tenant ON attachments FOR ALL
  USING (organization_id = app.current_organization_id())
  WITH CHECK (organization_id = app.current_organization_id());

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON attachments TO portal_app;
