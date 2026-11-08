// SPDX-License-Identifier: AGPL-3.0-or-later
import { Injectable, ForbiddenException, Inject } from '@nestjs/common';
import type { NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import postgres from 'postgres';
import { withOrgContext } from '@portal/db';
import { SessionService } from './session.service';
import type { SessionRecord } from './session.service';
import { DB_CONNECTION } from '../db/db.module';
import type { OrgRole } from '@portal/shared';

export interface AuthRequest extends Request {
  session?: SessionRecord;
  activeOrgId?: string | null;
  activeRole?: OrgRole | null;
}

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(
    private readonly sessions: SessionService,
    @Inject(DB_CONNECTION) private readonly sql: postgres.Sql,
  ) {}

  async use(req: AuthRequest, _res: Response, next: NextFunction) {
    const token = req.cookies?.['portal_session'] as string | undefined;
    if (!token) return next();

    let session = await this.sessions.validate(token);
    if (!session) return next();

    session = await this.sessions.revalidateActiveOrg(session);

    const headerOrg =
      typeof req.header('x-active-org') === 'string' ? req.header('x-active-org')! : null;
    if (headerOrg && headerOrg !== session.activeOrganizationId) {
      try {
        await this.sessions.setActiveOrg(session.id, session.userId, headerOrg);
        session = { ...session, activeOrganizationId: headerOrg };
      } catch {
        throw new ForbiddenException('Not a member of this organization');
      }
    }

    req.session = session;
    req.activeOrgId = session.activeOrganizationId;

    const orgId = req.activeOrgId;
    if (orgId) {
      const rows = (await withOrgContext(
        this.sql,
        {
          userId: session.userId,
          userEmail: session.userEmail,
          orgId: orgId,
        },
        async (tx) => {
          return tx<{ role: OrgRole }[]>`
            SELECT role FROM memberships
            WHERE user_id = ${session.userId} AND organization_id = ${orgId} AND status = 'active'
            LIMIT 1
          `;
        },
      )) as { role: OrgRole }[];

      const membership = rows[0];
      if (!membership) {
        throw new ForbiddenException('Not an active member of this organization');
      }
      req.activeRole = membership.role;
    }

    next();
  }
}
