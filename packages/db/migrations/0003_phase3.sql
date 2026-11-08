-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Phase 3: Workflow and Approval

CREATE TABLE workflow_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_by_user_id uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE approval_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  workflow_template_id uuid REFERENCES workflow_templates(id) ON DELETE SET NULL,
  requester_user_id uuid NOT NULL REFERENCES users(id),
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE approval_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  approval_request_id uuid NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,
  step_order integer NOT NULL,
  approver_user_id uuid REFERENCES users(id), -- NULL means any admin
  status text NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  comment text,
  acted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX workflow_templates_org_idx ON workflow_templates (organization_id);
CREATE INDEX approval_requests_org_status_idx ON approval_requests (organization_id, status);
CREATE INDEX approval_steps_request_order_idx ON approval_steps (approval_request_id, step_order);

-- Triggers
CREATE TRIGGER workflow_templates_set_updated_at BEFORE UPDATE ON workflow_templates FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();
CREATE TRIGGER approval_requests_set_updated_at BEFORE UPDATE ON approval_requests FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();
CREATE TRIGGER approval_steps_set_updated_at BEFORE UPDATE ON approval_steps FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

-- RLS
ALTER TABLE workflow_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY workflow_templates_tenant ON workflow_templates FOR ALL
  USING (organization_id = app.current_organization_id())
  WITH CHECK (organization_id = app.current_organization_id());

ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY approval_requests_tenant ON approval_requests FOR ALL
  USING (organization_id = app.current_organization_id())
  WITH CHECK (organization_id = app.current_organization_id());

ALTER TABLE approval_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY approval_steps_tenant ON approval_steps FOR ALL
  USING (organization_id = app.current_organization_id())
  WITH CHECK (organization_id = app.current_organization_id());

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON workflow_templates TO portal_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON approval_requests TO portal_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON approval_steps TO portal_app;
