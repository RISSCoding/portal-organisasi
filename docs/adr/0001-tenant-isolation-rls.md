ADR-0001: PostgreSQL RLS on a shared schema

Status: Accepted (Phase 0)
Context

Portal Organisasi is multi-tenant by default. Tenant boundaries must hold even if an application query forgets an organization_id filter.
Decision

    One PostgreSQL database, one public schema, mandatory organization_id.

    RLS enabled on every tenant-scoped table, enforced against session GUCs set via set_config(..., true).

    App connects as portal_app (non-owner).

    withOrgContext(sql, ctx, fn) is the only sanctioned entry point.

    SECURITY DEFINER is used only where RLS would block an otherwise-legitimate operation (is_org_member, is_org_admin, create_organization_with_owner, accept_invitation).

Consequences

    A bug in a query cannot leak rows across tenants: RLS denies.

    SET LOCAL requires queries to run inside a transaction; withOrgContext enforces this.
