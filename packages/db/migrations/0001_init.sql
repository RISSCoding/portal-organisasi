-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Initial schema for Portal Organisasi Phase 0.
-- Apply as the migration owner role. The runtime role is portal_app (non-owner).

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

-- Enums
CREATE TYPE org_role AS ENUM ('owner','admin','manager','member','guest');
CREATE TYPE membership_status AS ENUM ('invited','active','suspended','removed');
CREATE TYPE invitation_status AS ENUM ('pending','accepted','revoked','expired');
CREATE TYPE visibility AS ENUM ('private','org','public');
CREATE TYPE project_status AS ENUM ('planned','active','paused','completed','archived');
CREATE TYPE task_status AS ENUM ('todo','in_progress','blocked','done','cancelled');
CREATE TYPE task_priority AS ENUM ('low','medium','high','urgent');

-- Global users
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email citext NOT NULL UNIQUE,
  email_verified_at timestamptz,
  name text,
  password_hash text,
  mfa_enabled boolean NOT NULL DEFAULT false,
  mfa_totp_secret_encrypted text,
  mfa_recovery_codes_hashed text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Tenant root
CREATE TABLE organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug citext NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  logo_url text,
  visibility visibility NOT NULL DEFAULT 'private',
  created_by_user_id uuid NOT NULL REFERENCES users(id),
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- Memberships
CREATE TABLE memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role org_role NOT NULL DEFAULT 'member',
  status membership_status NOT NULL DEFAULT 'active',
  invited_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  joined_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT memberships_org_user_uq UNIQUE (organization_id, user_id)
);

-- Sessions
CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token_hash text NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires timestamptz NOT NULL,
  active_organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  mfa_verified_at timestamptz,
  mfa_pending boolean NOT NULL DEFAULT false,
  ip inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Password resets
CREATE TABLE password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Invitations
CREATE TABLE invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email citext NOT NULL,
  role org_role NOT NULL DEFAULT 'member',
  token_hash text NOT NULL UNIQUE,
  invited_by_user_id uuid NOT NULL REFERENCES users(id),
  status invitation_status NOT NULL DEFAULT 'pending',
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  accepted_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX invitations_pending_org_email_uq ON invitations (organization_id, email) WHERE status = 'pending';

-- Tenant-scoped resources
CREATE TABLE workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug citext NOT NULL,
  description text,
  visibility visibility NOT NULL DEFAULT 'private',
  created_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  CONSTRAINT workspaces_org_slug_uq UNIQUE (organization_id, slug),
  CONSTRAINT workspaces_id_org_uq UNIQUE (id, organization_id)
);

CREATE TABLE projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL,
  name text NOT NULL,
  slug citext NOT NULL,
  description text,
  status project_status NOT NULL DEFAULT 'planned',
  created_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  CONSTRAINT projects_workspace_slug_uq UNIQUE (workspace_id, slug),
  CONSTRAINT projects_id_org_uq UNIQUE (id, organization_id),
  CONSTRAINT projects_workspace_org_fk FOREIGN KEY (workspace_id, organization_id) REFERENCES workspaces(id, organization_id) ON DELETE CASCADE
);

CREATE TABLE tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  status task_status NOT NULL DEFAULT 'todo',
  priority task_priority NOT NULL DEFAULT 'medium',
  assignee_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tasks_project_org_fk FOREIGN KEY (project_id, organization_id) REFERENCES projects(id, organization_id) ON DELETE CASCADE
);

CREATE TABLE documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  workspace_id uuid,
  project_id uuid,
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  version integer NOT NULL DEFAULT 1,
  created_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  CONSTRAINT documents_workspace_org_fk FOREIGN KEY (workspace_id, organization_id) REFERENCES workspaces(id, organization_id) ON DELETE CASCADE,
  CONSTRAINT documents_project_org_fk FOREIGN KEY (project_id, organization_id) REFERENCES projects(id, organization_id) ON DELETE CASCADE
);

-- Audit logs
CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Feature flags
CREATE TABLE instance_feature_flags (
  key text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE organization_feature_flags (
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  key text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, key)
);

-- Indexes
CREATE INDEX memberships_org_role_idx ON memberships (organization_id, role);
CREATE INDEX memberships_user_idx ON memberships (user_id);
CREATE INDEX invitations_org_status_idx ON invitations (organization_id, status);
CREATE INDEX invitations_email_status_idx ON invitations (email, status);
CREATE INDEX sessions_user_idx ON sessions (user_id);
CREATE INDEX sessions_active_org_idx ON sessions (active_organization_id);
CREATE INDEX password_reset_user_idx ON password_reset_tokens (user_id);

CREATE INDEX workspaces_active_idx ON workspaces (organization_id) WHERE archived_at IS NULL;
CREATE INDEX projects_active_idx ON projects (organization_id, workspace_id) WHERE archived_at IS NULL;
CREATE INDEX documents_active_idx ON documents (organization_id) WHERE archived_at IS NULL;

CREATE INDEX tasks_org_project_status_idx ON tasks (organization_id, project_id, status);
CREATE INDEX tasks_org_assignee_idx ON tasks (organization_id, assignee_user_id);
CREATE INDEX audit_logs_org_created_idx ON audit_logs (organization_id, created_at DESC);
CREATE INDEX audit_logs_org_action_idx ON audit_logs (organization_id, action);
CREATE INDEX audit_logs_resource_idx ON audit_logs (organization_id, resource_type, resource_id);

-- App schema & helpers
CREATE SCHEMA IF NOT EXISTS app;

-- Create app role idempotently for Docker/Testcontainers compatibility
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'portal_app') THEN
    CREATE ROLE portal_app LOGIN PASSWORD 'app';
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION app.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT c.table_name FROM information_schema.columns c WHERE c.table_schema = 'public' AND c.column_name = 'updated_at'
  LOOP
    EXECUTE format('CREATE TRIGGER %I_set_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION app.set_updated_at()', t, t);
  END LOOP;
END $$;

-- Context GUCs
CREATE OR REPLACE FUNCTION app.current_user_id() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.current_user_id', true), '')::uuid
$$;
CREATE OR REPLACE FUNCTION app.current_user_email() RETURNS citext LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.current_user_email', true), '')::citext
$$;
CREATE OR REPLACE FUNCTION app.current_organization_id() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.current_organization_id', true), '')::uuid
$$;

-- SECURITY DEFINER Helpers
CREATE OR REPLACE FUNCTION app.is_org_member(target_org uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (SELECT 1 FROM memberships WHERE organization_id = target_org AND user_id = app.current_user_id() AND status = 'active')
$$;

CREATE OR REPLACE FUNCTION app.is_org_admin(target_org uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (SELECT 1 FROM memberships WHERE organization_id = target_org AND user_id = app.current_user_id() AND status = 'active' AND role IN ('owner','admin'))
$$;

CREATE OR REPLACE FUNCTION app.is_org_owner(target_org uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (SELECT 1 FROM memberships WHERE organization_id = target_org AND user_id = app.current_user_id() AND status = 'active' AND role = 'owner')
$$;

-- Bootstrap Org
CREATE OR REPLACE FUNCTION app.create_organization_with_owner(p_slug text, p_name text, p_owner_user_id uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_caller uuid := app.current_user_id();
  v_org_id uuid;
BEGIN
  IF v_caller IS NULL OR v_caller <> p_owner_user_id THEN
    RAISE EXCEPTION 'caller (%) cannot create org on behalf of %', v_caller, p_owner_user_id USING ERRCODE = 'insufficient_privilege';
  END IF;
  INSERT INTO organizations (slug, name, created_by_user_id) VALUES (p_slug, p_name, p_owner_user_id) RETURNING id INTO v_org_id;
  INSERT INTO memberships (organization_id, user_id, role, status, joined_at) VALUES (v_org_id, p_owner_user_id, 'owner', 'active', now());
  RETURN v_org_id;
END;
$$;

-- Accept Invitation
CREATE OR REPLACE FUNCTION app.accept_invitation(p_token_hash text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_user users%ROWTYPE;
  v_inv invitations%ROWTYPE;
BEGIN
  SELECT * INTO v_user FROM users WHERE id = app.current_user_id();
  IF v_user.id IS NULL THEN RAISE EXCEPTION 'no authenticated user' USING ERRCODE = 'insufficient_privilege'; END IF;
  SELECT * INTO v_inv FROM invitations WHERE token_hash = p_token_hash AND status = 'pending' AND expires_at > now() AND email = v_user.email FOR UPDATE;
  IF v_inv.id IS NULL THEN RAISE EXCEPTION 'invalid or expired invitation' USING ERRCODE = 'no_data_found'; END IF;
  UPDATE invitations SET status = 'accepted', accepted_at = now(), accepted_by_user_id = v_user.id WHERE id = v_inv.id;
  INSERT INTO memberships (organization_id, user_id, role, status, invited_by_user_id, joined_at) VALUES (v_inv.organization_id, v_user.id, v_inv.role, 'active', v_inv.invited_by_user_id, now()) ON CONFLICT (organization_id, user_id) DO UPDATE SET role = EXCLUDED.role, status = 'active', joined_at = COALESCE(memberships.joined_at, now());
  RETURN v_inv.organization_id;
END;
$$;

-- RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY organizations_select ON organizations FOR SELECT USING (app.is_org_member(id) AND deleted_at IS NULL);
-- P0-B: No INSERT policy. Must use app.create_organization_with_owner.
CREATE POLICY organizations_update ON organizations FOR UPDATE USING (app.is_org_admin(id) AND app.current_organization_id() = id) WITH CHECK (app.is_org_admin(id) AND app.current_organization_id() = id);
CREATE POLICY organizations_delete ON organizations FOR DELETE USING (app.is_org_owner(id));

ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
-- P0-A.3: Split memberships_org_all.
CREATE POLICY memberships_read ON memberships FOR SELECT USING (organization_id = app.current_organization_id());
CREATE POLICY memberships_self_select ON memberships FOR SELECT USING (user_id = app.current_user_id());
CREATE POLICY memberships_admin_insert ON memberships FOR INSERT WITH CHECK (organization_id = app.current_organization_id() AND app.is_org_admin(app.current_organization_id()));
CREATE POLICY memberships_admin_update ON memberships FOR UPDATE USING (organization_id = app.current_organization_id() AND app.is_org_admin(app.current_organization_id())) WITH CHECK (organization_id = app.current_organization_id() AND app.is_org_admin(app.current_organization_id()));
CREATE POLICY memberships_admin_delete ON memberships FOR DELETE USING (organization_id = app.current_organization_id() AND app.is_org_admin(app.current_organization_id()));

ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY invitations_org_all ON invitations FOR ALL USING (organization_id = app.current_organization_id()) WITH CHECK (organization_id = app.current_organization_id());
CREATE POLICY invitations_invitee_select ON invitations FOR SELECT USING (email = app.current_user_email() AND status = 'pending');

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY workspaces_tenant ON workspaces FOR ALL USING (organization_id = app.current_organization_id()) WITH CHECK (organization_id = app.current_organization_id());

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY projects_tenant ON projects FOR ALL USING (organization_id = app.current_organization_id()) WITH CHECK (organization_id = app.current_organization_id());

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY tasks_tenant ON tasks FOR ALL USING (organization_id = app.current_organization_id()) WITH CHECK (organization_id = app.current_organization_id());

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY documents_tenant ON documents FOR ALL USING (organization_id = app.current_organization_id()) WITH CHECK (organization_id = app.current_organization_id());

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_logs_select ON audit_logs FOR SELECT USING (organization_id = app.current_organization_id());
CREATE POLICY audit_logs_insert ON audit_logs FOR INSERT WITH CHECK (organization_id = app.current_organization_id());

ALTER TABLE organization_feature_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY organization_feature_flags_tenant ON organization_feature_flags FOR ALL USING (organization_id = app.current_organization_id()) WITH CHECK (organization_id = app.current_organization_id());

-- Grants
GRANT USAGE ON SCHEMA public, app TO portal_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO portal_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO portal_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA app TO portal_app;
