-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Grant execute permission to portal_app for the SECURITY DEFINER function
GRANT EXECUTE ON FUNCTION app.validate_api_key(text) TO portal_app;
