// SPDX-License-Identifier: AGPL-3.0-or-later
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { IsString, MinLength, IsUUID, IsOptional, IsEnum } from 'class-validator';
import { TaskService } from './task.service';
import type { AuthRequest } from '../auth/tenant.middleware';
import { TASK_STATUSES, TASK_PRIORITIES } from '@portal/shared';

class CreateTaskDto {
  @IsUUID() projectId!: string;
  @IsString() @MinLength(2) title!: string;
  @IsOptional() @IsUUID() parentTaskId?: string;
}

class UpdateTaskDto {
  @IsOptional() @IsString() @MinLength(2) title?: string;
  @IsOptional() @IsEnum(TASK_STATUSES) status?: string;
  @IsOptional() @IsEnum(TASK_PRIORITIES) priority?: string;
}

@Controller('tasks')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Get('project/:projectId')
  async listByProject(@Param('projectId') projectId: string, @Req() req: AuthRequest) {
    if (!req.session || !req.activeOrgId || !req.activeRole)
      throw new UnauthorizedException('No active org');
    return this.taskService.listByProject(
      req.session.userId,
      req.session.userEmail,
      req.activeOrgId,
      req.activeRole,
      projectId,
    );
  }

  @Post()
  async create(@Body() dto: CreateTaskDto, @Req() req: AuthRequest) {
    if (!req.session || !req.activeOrgId || !req.activeRole)
      throw new UnauthorizedException('No active org');
    return this.taskService.create(
      req.session.userId,
      req.session.userEmail,
      req.activeOrgId,
      req.activeRole,
      dto.projectId,
      dto.title,
      dto.parentTaskId,
    );
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateTaskDto, @Req() req: AuthRequest) {
    if (!req.session || !req.activeOrgId || !req.activeRole)
      throw new UnauthorizedException('No active org');
    return this.taskService.update(
      req.session.userId,
      req.session.userEmail,
      req.activeOrgId,
      req.activeRole,
      id,
      dto,
    );
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Req() req: AuthRequest) {
    if (!req.session || !req.activeOrgId || !req.activeRole)
      throw new UnauthorizedException('No active org');
    return this.taskService.delete(
      req.session.userId,
      req.session.userEmail,
      req.activeOrgId,
      req.activeRole,
      id,
    );
  }
}
