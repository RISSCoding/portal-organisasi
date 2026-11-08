// SPDX-License-Identifier: AGPL-3.0-or-later
import { Controller, Get, Post, Body, Req, UnauthorizedException } from '@nestjs/common';
import { IsString, MinLength, Matches } from 'class-validator';
import { WorkspaceService } from './workspace.service';
import type { AuthRequest } from '../auth/tenant.middleware';

class CreateWorkspaceDto {
  @IsString() @MinLength(2) name!: string;
  @IsString() @Matches(/^[a-z0-9-]+$/) slug!: string;
}

@Controller('workspaces')
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  @Get()
  async list(@Req() req: AuthRequest) {
    if (!req.session || !req.activeOrgId || !req.activeRole) {
      throw new UnauthorizedException('No active organization');
    }
    return this.workspaceService.list(
      req.session.userId,
      req.session.userEmail,
      req.activeOrgId,
      req.activeRole,
    );
  }

  @Post()
  async create(@Body() dto: CreateWorkspaceDto, @Req() req: AuthRequest) {
    if (!req.session || !req.activeOrgId || !req.activeRole) {
      throw new UnauthorizedException('No active organization');
    }
    return this.workspaceService.create(
      req.session.userId,
      req.session.userEmail,
      req.activeOrgId,
      req.activeRole,
      dto.name,
      dto.slug,
    );
  }
}
