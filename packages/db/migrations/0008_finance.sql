-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Finance: Budgets and Expenses

CREATE TABLE budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  amount numeric(12,2) NOT NULL,
  created_by_user_id uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  budget_id uuid REFERENCES budgets(id) ON DELETE SET NULL,
  requester_user_id uuid NOT NULL REFERENCES users(id),
  title text NOT NULL,
  amount numeric(12,2) NOT NULL,
  receipt_url text, -- S3 storage key for receipt
  status text NOT NULL DEFAULT 'pending', -- pending, approved, rejected, reimbursed
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX budgets_org_idx ON budgets (organization_id);
CREATE INDEX expenses_org_status_idx ON expenses (organization_id, status);

-- Triggers
CREATE TRIGGER budgets_set_updated_at BEFORE UPDATE ON budgets FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();
CREATE TRIGGER expenses_set_updated_at BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

-- RLS
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY budgets_tenant ON budgets FOR ALL
  USING (organization_id = app.current_organization_id())
  WITH CHECK (organization_id = app.current_organization_id());

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY expenses_tenant ON expenses FOR ALL
  USING (organization_id = app.current_organization_id())
  WITH CHECK (organization_id = app.current_organization_id());

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON budgets TO portal_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON expenses TO portal_app;
