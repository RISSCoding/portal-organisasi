-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Domain Verification for Auto-Join

CREATE TABLE organization_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  domain citext NOT NULL,
  auto_join_role org_role NOT NULL DEFAULT 'member',
  created_by_user_id uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT organization_domains_org_domain_uq UNIQUE (organization_id, domain)
);

CREATE INDEX organization_domains_domain_idx ON organization_domains (domain);

-- RLS
ALTER TABLE organization_domains ENABLE ROW LEVEL SECURITY;
CREATE POLICY organization_domains_tenant ON organization_domains FOR ALL
  USING (organization_id = app.current_organization_id())
  WITH CHECK (organization_id = app.current_organization_id());

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON organization_domains TO portal_app;
