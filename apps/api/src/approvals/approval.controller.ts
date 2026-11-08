// SPDX-License-Identifier: AGPL-3.0-or-later
import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { IsString, MinLength, IsIn, IsOptional } from 'class-validator';
import { ApprovalService } from './approval.service';
import type { AuthRequest } from '../auth/tenant.middleware';

class CreateApprovalDto {
  @IsString() @MinLength(2) title!: string;
  @IsString() description!: string;
}

class ActApprovalDto {
  @IsIn(['approve', 'reject']) action!: 'approve' | 'reject';
  @IsOptional() @IsString() comment?: string;
}

@Controller('approvals')
export class ApprovalController {
  constructor(private readonly approvalService: ApprovalService) {}

  @Get()
  async list(@Req() req: AuthRequest) {
    if (!req.session || !req.activeOrgId || !req.activeRole)
      throw new UnauthorizedException('No active org');
    return this.approvalService.list(
      req.session.userId,
      req.session.userEmail,
      req.activeOrgId,
      req.activeRole,
    );
  }

  @Post()
  async create(@Body() dto: CreateApprovalDto, @Req() req: AuthRequest) {
    if (!req.session || !req.activeOrgId || !req.activeRole)
      throw new UnauthorizedException('No active org');
    return this.approvalService.create(
      req.session.userId,
      req.session.userEmail,
      req.activeOrgId,
      req.activeRole,
      dto.title,
      dto.description,
    );
  }

  @Patch(':id/act')
  async act(@Param('id') id: string, @Body() dto: ActApprovalDto, @Req() req: AuthRequest) {
    if (!req.session || !req.activeOrgId || !req.activeRole)
      throw new UnauthorizedException('No active org');
    return this.approvalService.act(
      req.session.userId,
      req.session.userEmail,
      req.activeOrgId,
      req.activeRole,
      id,
      dto.action,
      dto.comment,
    );
  }
}
