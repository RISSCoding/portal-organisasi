// SPDX-License-Identifier: AGPL-3.0-or-later
import { Injectable, Inject } from '@nestjs/common';
import postgres from 'postgres';
import { DB_CONNECTION } from '../db/db.module';
import { withOrgContext } from '@portal/db';
import { can } from '@portal/auth';
import { AppError, ERROR_CODES } from '@portal/shared';
import type { OrgRole } from '@portal/shared';

@Injectable()
export class ProjectService {
  constructor(@Inject(DB_CONNECTION) private readonly sql: postgres.Sql) {}

  async list(userId: string, userEmail: string, orgId: string, workspaceId: string, role: OrgRole) {
    if (!can(role, 'project', 'read')) {
      throw new AppError(ERROR_CODES.FORBIDDEN, 'Cannot read projects', 403);
    }
    return withOrgContext(this.sql, { userId, userEmail, orgId }, async (tx) => {
      return tx`
        SELECT id, name, slug, status, created_at
        FROM projects WHERE organization_id = ${orgId} AND workspace_id = ${workspaceId} AND archived_at IS NULL
      `;
    });
  }

  async create(
    userId: string,
    userEmail: string,
    orgId: string,
    workspaceId: string,
    role: OrgRole,
    name: string,
    slug: string,
  ) {
    if (!can(role, 'project', 'create')) {
      throw new AppError(ERROR_CODES.FORBIDDEN, 'Cannot create project', 403);
    }
    return withOrgContext(this.sql, { userId, userEmail, orgId }, async (tx) => {
      try {
        const [p] = await tx`
          INSERT INTO projects (organization_id, workspace_id, name, slug, created_by_user_id)
          VALUES (${orgId}, ${workspaceId}, ${name}, ${slug}, ${userId})
          RETURNING id, name, slug
        `;
        return p!;
      } catch (e: unknown) {
        if (typeof e === 'object' && e !== null && 'code' in e && e.code === '23505') {
          throw new AppError(ERROR_CODES.SLUG_TAKEN, 'Project slug taken', 409);
        }
        throw e;
      }
    });
  }
}
