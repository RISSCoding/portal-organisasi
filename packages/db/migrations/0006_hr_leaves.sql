-- SPDX-License-Identifier: AGPL-3.0-or-later
-- HR: Leave Requests and Balances

CREATE TABLE leave_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  year integer NOT NULL,
  total_days integer NOT NULL DEFAULT 12,
  used_days integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT leave_balances_org_user_year_uq UNIQUE (organization_id, user_id, year)
);

CREATE TABLE leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'annual', -- annual, sick, urgent, etc.
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  approved_by_user_id uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT leave_requests_dates_check CHECK (end_date >= start_date)
);

-- Indexes
CREATE INDEX leave_balances_org_user_idx ON leave_balances (organization_id, user_id);
CREATE INDEX leave_requests_org_user_idx ON leave_requests (organization_id, user_id);
CREATE INDEX leave_requests_org_status_idx ON leave_requests (organization_id, status);

-- Triggers
CREATE TRIGGER leave_balances_set_updated_at BEFORE UPDATE ON leave_balances FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();
CREATE TRIGGER leave_requests_set_updated_at BEFORE UPDATE ON leave_requests FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

-- RLS
ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY leave_balances_tenant ON leave_balances FOR ALL
  USING (organization_id = app.current_organization_id())
  WITH CHECK (organization_id = app.current_organization_id());

ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY leave_requests_tenant ON leave_requests FOR ALL
  USING (organization_id = app.current_organization_id())
  WITH CHECK (organization_id = app.current_organization_id());

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON leave_balances TO portal_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON leave_requests TO portal_app;
