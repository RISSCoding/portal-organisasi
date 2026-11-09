// SPDX-License-Identifier: AGPL-3.0-or-later
import { Injectable, Inject } from '@nestjs/common';
import type postgres from 'postgres';
import { DB_CONNECTION } from '../db/db.module';
import { withOrgContext } from '@portal/db';
import { can } from '@portal/auth';
import { AppError, ERROR_CODES } from '@portal/shared';
import type { OrgRole } from '@portal/shared';

@Injectable()
export class DomainService {
  constructor(@Inject(DB_CONNECTION) private readonly sql: postgres.Sql) {}

  async listDomains(userId: string, userEmail: string, orgId: string, role: OrgRole) {
    if (!can(role, 'policy', 'read')) {
      throw new AppError(ERROR_CODES.FORBIDDEN, 'Cannot read domains', 403);
    }
    return withOrgContext(this.sql, { userId, userEmail, orgId }, async (tx) => {
      return tx`
        SELECT id, domain, auto_join_role, created_at
        FROM organization_domains
        WHERE organization_id = ${orgId}
        ORDER BY created_at DESC
      `;
    });
  }

  async addDomain(
    userId: string,
    userEmail: string,
    orgId: string,
    role: OrgRole,
    domain: string,
    autoJoinRole: OrgRole,
  ) {
    if (!can(role, 'policy', 'update')) {
      throw new AppError(ERROR_CODES.FORBIDDEN, 'Only admins can add domains', 403);
    }
    return withOrgContext(this.sql, { userId, userEmail, orgId }, async (tx) => {
      try {
        const [result] = await tx<{ id: string }[]>`
          INSERT INTO organization_domains (organization_id, domain, auto_join_role, created_by_user_id)
          VALUES (${orgId}, ${domain}, ${autoJoinRole}, ${userId})
          RETURNING id
        `;
        return result!;
      } catch (e: unknown) {
        if (typeof e === 'object' && e !== null && 'code' in e && e.code === '23505') {
          throw new AppError(ERROR_CODES.SLUG_TAKEN, 'Domain already registered', 409);
        }
        throw e;
      }
    });
  }

  async removeDomain(
    userId: string,
    userEmail: string,
    orgId: string,
    role: OrgRole,
    domainId: string,
  ) {
    if (!can(role, 'policy', 'update')) {
      throw new AppError(ERROR_CODES.FORBIDDEN, 'Only admins can remove domains', 403);
    }
    return withOrgContext(this.sql, { userId, userEmail, orgId }, async (tx) => {
      const [deleted] = await tx<{ id: string }[]>`
        DELETE FROM organization_domains WHERE id = ${domainId} AND organization_id = ${orgId} RETURNING id
      `;
      if (!deleted) throw new AppError(ERROR_CODES.NOT_FOUND, 'Domain not found', 404);
      return { ok: true };
    });
  }
}
