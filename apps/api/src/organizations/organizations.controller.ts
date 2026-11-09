// SPDX-License-Identifier: AGPL-3.0-or-later
import { Controller, Get, Patch, Body, Req, UnauthorizedException, Inject } from '@nestjs/common';
import type postgres from 'postgres';
import type { AuthRequest } from '../auth/tenant.middleware';
import { DB_CONNECTION } from '../db/db.module';
import { withOrgContext } from '@portal/db';
import { can } from '@portal/auth';
import { AppError, ERROR_CODES } from '@portal/shared';
import { IsString, IsOptional, IsUrl, IsHexColor, MinLength } from 'class-validator';

class UpdateOrgDto {
  @IsOptional() @IsString() @MinLength(2) name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsUrl({ require_tld: false }) logoUrl?: string;
  @IsOptional() @IsHexColor() primaryColor?: string;
}

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
        SELECT o.id, o.slug, o.name, o.description, o.logo_url, o.settings, m.role
        FROM organizations o
        JOIN memberships m ON m.organization_id = o.id
        WHERE m.user_id = ${userId} AND m.status = 'active'
      `;
    });
  }

  @Get('current')
  async currentOrg(@Req() req: AuthRequest) {
    if (!req.session || !req.activeOrgId || !req.activeRole) {
      throw new UnauthorizedException('No active org');
    }
    const { userId, userEmail } = req.session;
    const orgId = req.activeOrgId;

    return withOrgContext(this.sql, { userId, userEmail, orgId }, async (tx) => {
      const [org] = await tx`
        SELECT id, slug, name, description, logo_url, settings
        FROM organizations WHERE id = ${orgId}
      `;
      if (!org) throw new AppError(ERROR_CODES.NOT_FOUND, 'Organization not found', 404);
      return org;
    });
  }

  @Patch('current')
  async updateOrg(@Body() dto: UpdateOrgDto, @Req() req: AuthRequest) {
    if (!req.session || !req.activeOrgId || !req.activeRole) {
      throw new UnauthorizedException('No active org');
    }
    if (!can(req.activeRole, 'org', 'update')) {
      throw new AppError(
        ERROR_CODES.FORBIDDEN,
        'Only admins can update organization settings',
        403,
      );
    }
    const { userId, userEmail } = req.session;
    const orgId = req.activeOrgId;

    return withOrgContext(this.sql, { userId, userEmail, orgId }, async (tx) => {
      const [current] = await tx<{ settings: Record<string, unknown> }[]>`
        SELECT settings FROM organizations WHERE id = ${orgId}
      `;
      const newSettings: Record<string, unknown> = { ...(current?.settings ?? {}) };
      if (dto.primaryColor) newSettings.primaryColor = dto.primaryColor;

      // Use tx.json() to explicitly serialize as JSONB (postgres.js helper).
      // Avoids JSON.stringify() double-encoding and satisfies TS type signature.
      const [updated] = await tx`
        UPDATE organizations
        SET
          name = COALESCE(${dto.name ?? null}, name),
          description = COALESCE(${dto.description ?? null}, description),
          logo_url = COALESCE(${dto.logoUrl ?? null}, logo_url),
          settings = ${tx.json(newSettings)},
          updated_at = now()
        WHERE id = ${orgId}
        RETURNING id, name, description, logo_url, settings
      `;
      return updated!;
    });
  }
}
