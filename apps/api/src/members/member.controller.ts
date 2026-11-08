// SPDX-License-Identifier: AGPL-3.0-or-later
import { Controller, Get, Req, UnauthorizedException, Inject } from '@nestjs/common';
import type postgres from 'postgres';
import { DB_CONNECTION } from '../db/db.module';
import { withOrgContext } from '@portal/db';
import type { AuthRequest } from '../auth/tenant.middleware';
import { can } from '@portal/auth';
import { AppError, ERROR_CODES } from '@portal/shared';

@Controller('members')
export class MemberController {
  constructor(@Inject(DB_CONNECTION) private readonly sql: postgres.Sql) {}

  @Get()
  async list(@Req() req: AuthRequest) {
    if (!req.session || !req.activeOrgId || !req.activeRole) {
      throw new UnauthorizedException('No active org');
    }

    const { userId, userEmail } = req.session;
    const orgId = req.activeOrgId;
    const role = req.activeRole;

    if (!can(role, 'member', 'read')) {
      throw new AppError(ERROR_CODES.FORBIDDEN, 'Cannot read members', 403);
    }

    return withOrgContext(this.sql, { userId, userEmail, orgId }, async (tx) => {
      return tx`
        SELECT m.user_id, u.email, u.name, m.role, m.status, m.joined_at
        FROM memberships m
        JOIN users u ON u.id = m.user_id
        WHERE m.organization_id = ${orgId} AND m.status = 'active'
        ORDER BY m.joined_at ASC
      `;
    });
  }
}
