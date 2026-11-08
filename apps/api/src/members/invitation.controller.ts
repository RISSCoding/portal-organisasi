// SPDX-License-Identifier: AGPL-3.0-or-later
import { Controller, Post, Body, Req, UnauthorizedException } from '@nestjs/common';
import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';
import { InvitationService } from './invitation.service';
import type { AuthRequest } from '../auth/tenant.middleware';
import type { OrgRole } from '@portal/shared';
import { ORG_ROLES } from '@portal/shared';

class InviteDto {
  @IsEmail() email!: string;
  @IsEnum(ORG_ROLES) role!: OrgRole;
}

class AcceptDto {
  @IsString() @MinLength(10) token!: string;
}

@Controller('invitations')
export class InvitationController {
  constructor(private readonly inviteService: InvitationService) {}

  @Post()
  async invite(@Body() dto: InviteDto, @Req() req: AuthRequest) {
    if (!req.session || !req.activeOrgId || !req.activeRole)
      throw new UnauthorizedException('No active org');
    return this.inviteService.invite(
      req.session.userId,
      req.session.userEmail,
      req.activeOrgId,
      req.activeRole,
      dto.email,
      dto.role,
    );
  }

  @Post('accept')
  async accept(@Body() dto: AcceptDto, @Req() req: AuthRequest) {
    if (!req.session) throw new UnauthorizedException('Must be logged in');
    return this.inviteService.accept(req.session.userId, req.session.userEmail, dto.token);
  }
}
