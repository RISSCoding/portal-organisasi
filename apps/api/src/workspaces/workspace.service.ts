// SPDX-License-Identifier: AGPL-3.0-or-later
import { Injectable, Inject } from '@nestjs/common';
import postgres from 'postgres';
import { DB_CONNECTION } from '../db/db.module';
import { withOrgContext } from '@portal/db';
import { can } from '@portal/auth';
import { AppError, ERROR_CODES } from '@portal/shared';
import type { OrgRole } from '@portal/shared';

@Injectable()
export class WorkspaceService {
  constructor(@Inject(DB_CONNECTION) private readonly sql: postgres.Sql) {}

  async list(userId: string, userEmail: string, orgId: string, role: OrgRole) {
    if (!can(role, 'workspace', 'read')) {
      throw new AppError(ERROR_CODES.FORBIDDEN, 'Cannot read workspaces', 403);
    }
    return withOrgContext(this.sql, { userId, userEmail, orgId }, async (tx) => {
      return tx`
        SELECT id, name, slug, description, visibility, created_at, updated_at
        FROM workspaces WHERE organization_id = ${orgId} AND archived_at IS NULL
      `;
    });
  }

  async create(
    userId: string,
    userEmail: string,
    orgId: string,
    role: OrgRole,
    name: string,
    slug: string,
  ) {
    if (!can(role, 'workspace', 'create')) {
      throw new AppError(ERROR_CODES.FORBIDDEN, 'Cannot create workspace', 403);
    }
    return withOrgContext(this.sql, { userId, userEmail, orgId }, async (tx) => {
      try {
        const [ws] = await tx`
          INSERT INTO workspaces (organization_id, name, slug, created_by_user_id)
          VALUES (${orgId}, ${name}, ${slug}, ${userId})
          RETURNING id, name, slug
        `;
        return ws!;
      } catch (e: unknown) {
        if (typeof e === 'object' && e !== null && 'code' in e && e.code === '23505') {
          throw new AppError(ERROR_CODES.SLUG_TAKEN, 'Workspace slug taken', 409);
        }
        throw e;
      }
    });
  }
}
