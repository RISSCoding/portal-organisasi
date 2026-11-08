-- SPDX-License-Identifier: AGPL-3.0-or-later
CREATE OR REPLACE FUNCTION app.accept_invitation(p_token_hash text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_user users%ROWTYPE;
  v_inv invitations%ROWTYPE;
BEGIN
  SELECT * INTO v_user FROM users WHERE id = app.current_user_id();
  IF v_user.id IS NULL THEN 
    RAISE EXCEPTION 'no authenticated user' USING ERRCODE = 'insufficient_privilege'; 
  END IF;
  
  -- Idempotency: if already accepted by this user, return success
  SELECT * INTO v_inv FROM invitations 
  WHERE token_hash = p_token_hash 
    AND email = v_user.email
    AND status = 'accepted'
    AND accepted_by_user_id = v_user.id;
  IF v_inv.id IS NOT NULL THEN
    RETURN v_inv.organization_id;
  END IF;
  
  -- Normal: find pending invitation
  SELECT * INTO v_inv FROM invitations 
  WHERE token_hash = p_token_hash 
    AND status = 'pending' 
    AND expires_at > now() 
    AND email = v_user.email 
  FOR UPDATE;
  IF v_inv.id IS NULL THEN 
    RAISE EXCEPTION 'invalid or expired invitation' USING ERRCODE = 'no_data_found'; 
  END IF;
  
  UPDATE invitations 
  SET status = 'accepted', accepted_at = now(), accepted_by_user_id = v_user.id 
  WHERE id = v_inv.id;
  
  INSERT INTO memberships (organization_id, user_id, role, status, invited_by_user_id, joined_at) 
  VALUES (v_inv.organization_id, v_user.id, v_inv.role, 'active', v_inv.invited_by_user_id, now()) 
  ON CONFLICT (organization_id, user_id) DO UPDATE 
    SET role = EXCLUDED.role, status = 'active', joined_at = COALESCE(memberships.joined_at, now());
  
  RETURN v_inv.organization_id;
END;
$$;
