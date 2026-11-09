-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Phase 3: API Keys for Extensibility

CREATE TABLE api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  prefix text NOT NULL, -- e.g., "pk_live_1234" for display purposes
  key_hash text NOT NULL UNIQUE, -- SHA-256 hash of the actual key
  last_used_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX api_keys_org_idx ON api_keys (organization_id);
CREATE INDEX api_keys_hash_idx ON api_keys (key_hash);

-- RLS
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY api_keys_tenant ON api_keys FOR ALL
  USING (organization_id = app.current_organization_id())
  WITH CHECK (organization_id = app.current_organization_id());

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON api_keys TO portal_app;
