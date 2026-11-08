// SPDX-License-Identifier: AGPL-3.0-or-later
import { Controller, Get, Req, UnauthorizedException, Inject } from '@nestjs/common';
import type postgres from 'postgres';
import type { AuthRequest } from '../auth/tenant.middleware';
import { DB_CONNECTION } from '../db/db.module';
import { withOrgContext } from '@portal/db';

@Controller('organizations')
export class OrganizationsController {
  constructor(@Inject(DB_CONNECTION) private readonly sql: postgres.Sql) {}

  @Get('me')
  async myOrgs(@Req() req: AuthRequest) {
    if (!req.session) throw new UnauthorizedException();

    const { userId, userEmail } = req.session;
    const orgId = req.activeOrgId ?? null;

    return withOrgContext(this.sql, { userId, userEmail, orgId }, async (tx) => {
      return tx`
          SELECT o.id, o.slug, o.name, m.role
          FROM organizations o
          JOIN memberships m ON m.organization_id = o.id
          WHERE m.user_id = ${userId} AND m.status = 'active'
        `;
    });
  }
}
