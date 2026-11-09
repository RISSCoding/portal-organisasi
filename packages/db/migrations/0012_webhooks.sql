-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Phase 3: Webhooks for Extensibility

CREATE TABLE webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  url text NOT NULL,
  secret text NOT NULL, -- Used to sign payloads (HMAC)
  events text[] NOT NULL DEFAULT '{}', -- e.g., '{task.created, member.joined}'
  is_active boolean NOT NULL DEFAULT true,
  created_by_user_id uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  webhook_id uuid NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  event text NOT NULL,
  payload jsonb NOT NULL,
  status_code integer, -- HTTP status from the receiver
  response_body text,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX webhooks_org_idx ON webhooks (organization_id);
CREATE INDEX webhook_deliveries_org_idx ON webhook_deliveries (organization_id);
CREATE INDEX webhook_deliveries_webhook_idx ON webhook_deliveries (webhook_id);

-- Triggers
CREATE TRIGGER webhooks_set_updated_at BEFORE UPDATE ON webhooks FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

-- RLS
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY webhooks_tenant ON webhooks FOR ALL
  USING (organization_id = app.current_organization_id())
  WITH CHECK (organization_id = app.current_organization_id());

ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY webhook_deliveries_tenant ON webhook_deliveries FOR ALL
  USING (organization_id = app.current_organization_id())
  WITH CHECK (organization_id = app.current_organization_id());

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON webhooks TO portal_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON webhook_deliveries TO portal_app;
