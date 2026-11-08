// SPDX-License-Identifier: AGPL-3.0-or-later
import { Controller, Get, Post, Body, Param, Req, UnauthorizedException } from '@nestjs/common';
import { IsString, MinLength, Matches, IsUUID } from 'class-validator';
import { ProjectService } from './project.service';
import type { AuthRequest } from '../auth/tenant.middleware';

class CreateProjectDto {
  @IsUUID() workspaceId!: string;
  @IsString() @MinLength(2) name!: string;
  @IsString() @Matches(/^[a-z0-9-]+$/) slug!: string;
}

@Controller('projects')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Get('workspace/:workspaceId')
  async list(@Param('workspaceId') workspaceId: string, @Req() req: AuthRequest) {
    if (!req.session || !req.activeOrgId || !req.activeRole) {
      throw new UnauthorizedException('No active organization');
    }
    return this.projectService.list(
      req.session.userId,
      req.session.userEmail,
      req.activeOrgId,
      workspaceId,
      req.activeRole,
    );
  }

  @Post()
  async create(@Body() dto: CreateProjectDto, @Req() req: AuthRequest) {
    if (!req.session || !req.activeOrgId || !req.activeRole) {
      throw new UnauthorizedException('No active organization');
    }
    return this.projectService.create(
      req.session.userId,
      req.session.userEmail,
      req.activeOrgId,
      dto.workspaceId,
      req.activeRole,
      dto.name,
      dto.slug,
    );
  }
}
