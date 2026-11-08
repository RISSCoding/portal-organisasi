-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Phase 1: Workspace, Tasks, Comments, Notifications

-- 1. Tambahkan parent_task_id untuk mendukung subtask
ALTER TABLE tasks ADD COLUMN parent_task_id uuid REFERENCES tasks(id) ON DELETE CASCADE;

-- 2. Tabel Komentar
CREATE TABLE comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE,
  author_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT comments_target_check CHECK (
    (task_id IS NOT NULL AND document_id IS NULL) OR
    (task_id IS NULL AND document_id IS NOT NULL)
  )
);

-- 3. Tabel Notifikasi
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL, -- e.g., 'task_assigned', 'comment_mention'
  title text NOT NULL,
  body text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX comments_org_task_idx ON comments (organization_id, task_id);
CREATE INDEX comments_org_document_idx ON comments (organization_id, document_id);
CREATE INDEX notifications_user_idx ON notifications (user_id, is_read);
CREATE INDEX tasks_org_parent_idx ON tasks (organization_id, parent_task_id);

-- Triggers for updated_at
CREATE TRIGGER comments_set_updated_at BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

-- RLS (Policies)
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY comments_tenant ON comments FOR ALL
  USING (organization_id = app.current_organization_id())
  WITH CHECK (organization_id = app.current_organization_id());

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY notifications_tenant ON notifications FOR ALL
  USING (organization_id = app.current_organization_id() AND user_id = app.current_user_id())
  WITH CHECK (organization_id = app.current_organization_id() AND user_id = app.current_user_id());

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON comments TO portal_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON notifications TO portal_app;
