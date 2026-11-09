-- SPDX-License-Identifier: AGPL-3.0-or-later
-- SECURITY DEFINER function to validate API keys without RLS interference
CREATE OR REPLACE FUNCTION app.validate_api_key(p_key_hash text) RETURNS TABLE (
  id uuid,
  organization_id uuid,
  user_id uuid,
  email citext,
  expires_at timestamptz
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT k.id, k.organization_id, k.user_id, u.email, k.expires_at
  FROM api_keys k
  JOIN users u ON u.id = k.user_id
  WHERE k.key_hash = p_key_hash
$$;
