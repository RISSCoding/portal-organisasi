// SPDX-License-Identifier: AGPL-3.0-or-later
import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { IsString, IsIn } from 'class-validator';
import { DomainService } from './domain.service';
import type { AuthRequest } from '../auth/tenant.middleware';
import type { OrgRole } from '@portal/shared';
import { ORG_ROLES } from '@portal/shared';

class AddDomainDto {
  @IsString() domain!: string;
  @IsIn(ORG_ROLES) autoJoinRole!: OrgRole;
}

@Controller('domains')
export class DomainController {
  constructor(private readonly domainService: DomainService) {}

  @Get()
  async list(@Req() req: AuthRequest) {
    if (!req.session || !req.activeOrgId || !req.activeRole)
      throw new UnauthorizedException('No active org');
    return this.domainService.listDomains(
      req.session.userId,
      req.session.userEmail,
      req.activeOrgId,
      req.activeRole,
    );
  }

  @Post()
  async add(@Body() dto: AddDomainDto, @Req() req: AuthRequest) {
    if (!req.session || !req.activeOrgId || !req.activeRole)
      throw new UnauthorizedException('No active org');
    return this.domainService.addDomain(
      req.session.userId,
      req.session.userEmail,
      req.activeOrgId,
      req.activeRole,
      dto.domain,
      dto.autoJoinRole,
    );
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: AuthRequest) {
    if (!req.session || !req.activeOrgId || !req.activeRole)
      throw new UnauthorizedException('No active org');
    return this.domainService.removeDomain(
      req.session.userId,
      req.session.userEmail,
      req.activeOrgId,
      req.activeRole,
      id,
    );
  }
}
