-- SPDX-License-Identifier: AGPL-3.0-or-later
-- SECURITY DEFINER function to allow auto-join across RLS boundaries
CREATE OR REPLACE FUNCTION app.auto_join_organizations(p_user_id uuid, p_email citext) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_domain citext;
  v_org_id uuid;
  v_role org_role;
BEGIN
  v_domain := split_part(p_email::text, '@', 2);
  IF v_domain IS NULL OR v_domain = '' THEN
    RETURN;
  END IF;

  FOR v_org_id, v_role IN
    SELECT organization_id, auto_join_role FROM organization_domains WHERE domain = v_domain
  LOOP
    INSERT INTO memberships (organization_id, user_id, role, status, joined_at)
    VALUES (v_org_id, p_user_id, v_role, 'active', now())
    ON CONFLICT (organization_id, user_id) DO NOTHING;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION app.auto_join_organizations(uuid, citext) TO portal_app;
