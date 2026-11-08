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
import { IsString, IsDateString, IsIn } from 'class-validator';
import { HrService } from './hr.service';
import type { AuthRequest } from '../auth/tenant.middleware';

class CreateLeaveDto {
  @IsString() type!: string;
  @IsDateString() startDate!: string;
  @IsDateString() endDate!: string;
  @IsString() reason!: string;
}

class UpdateLeaveStatusDto {
  @IsIn(['approved', 'rejected']) status!: 'approved' | 'rejected';
}

@Controller('hr/leaves')
export class HrController {
  constructor(private readonly hrService: HrService) {}

  @Get('balance')
  async getMyBalance(@Req() req: AuthRequest) {
    if (!req.session || !req.activeOrgId || !req.activeRole)
      throw new UnauthorizedException('No active org');
    return this.hrService.getMyBalance(
      req.session.userId,
      req.session.userEmail,
      req.activeOrgId,
      req.activeRole,
    );
  }

  @Get('my')
  async listMyLeaves(@Req() req: AuthRequest) {
    if (!req.session || !req.activeOrgId || !req.activeRole)
      throw new UnauthorizedException('No active org');
    return this.hrService.listMyLeaves(
      req.session.userId,
      req.session.userEmail,
      req.activeOrgId,
      req.activeRole,
    );
  }

  @Post()
  async createLeave(@Body() dto: CreateLeaveDto, @Req() req: AuthRequest) {
    if (!req.session || !req.activeOrgId || !req.activeRole)
      throw new UnauthorizedException('No active org');
    return this.hrService.createLeave(
      req.session.userId,
      req.session.userEmail,
      req.activeOrgId,
      req.activeRole,
      dto.type,
      dto.startDate,
      dto.endDate,
      dto.reason,
    );
  }

  @Get('all')
  async listAllLeaves(@Req() req: AuthRequest) {
    if (!req.session || !req.activeOrgId || !req.activeRole)
      throw new UnauthorizedException('No active org');
    return this.hrService.listAllLeaves(
      req.session.userId,
      req.session.userEmail,
      req.activeOrgId,
      req.activeRole,
    );
  }

  @Patch(':id/status')
  async updateLeaveStatus(
    @Param('id') id: string,
    @Body() dto: UpdateLeaveStatusDto,
    @Req() req: AuthRequest,
  ) {
    if (!req.session || !req.activeOrgId || !req.activeRole)
      throw new UnauthorizedException('No active org');
    return this.hrService.updateLeaveStatus(
      req.session.userId,
      req.session.userEmail,
      req.activeOrgId,
      req.activeRole,
      id,
      dto.status,
    );
  }
}
