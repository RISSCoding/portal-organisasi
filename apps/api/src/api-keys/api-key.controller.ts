// SPDX-License-Identifier: AGPL-3.0-or-later
import { Controller, Get, Post, Body, Req, UnauthorizedException } from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import { ApiKeyService } from './api-key.service';
import type { AuthRequest } from '../auth/tenant.middleware';

class CreateApiKeyDto {
  @IsString() @MinLength(3) name!: string;
}

@Controller('api-keys')
export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  @Get()
  async list(@Req() req: AuthRequest) {
    if (!req.session || !req.activeOrgId || !req.activeRole)
      throw new UnauthorizedException('No active org');
    return this.apiKeyService.listKeys(
      req.session.userId,
      req.session.userEmail,
      req.activeOrgId,
      req.activeRole,
    );
  }

  @Post()
  async create(@Body() dto: CreateApiKeyDto, @Req() req: AuthRequest) {
    if (!req.session || !req.activeOrgId || !req.activeRole)
      throw new UnauthorizedException('No active org');
    return this.apiKeyService.createKey(
      req.session.userId,
      req.session.userEmail,
      req.activeOrgId,
      req.activeRole,
      dto.name,
    );
  }
}
