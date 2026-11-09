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
import { IsString, IsUrl, IsArray, ArrayMinSize } from 'class-validator';
import { WebhookService } from './webhook.service';
import type { AuthRequest } from '../auth/tenant.middleware';

class CreateWebhookDto {
  @IsString() name!: string;
  @IsUrl({ require_tld: false }) url!: string;
  @IsArray() @ArrayMinSize(1) events!: string[];
}

@Controller('webhooks')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Get()
  async list(@Req() req: AuthRequest) {
    if (!req.session || !req.activeOrgId || !req.activeRole)
      throw new UnauthorizedException('No active org');
    return this.webhookService.listWebhooks(
      req.session.userId,
      req.session.userEmail,
      req.activeOrgId,
      req.activeRole,
    );
  }

  @Post()
  async create(@Body() dto: CreateWebhookDto, @Req() req: AuthRequest) {
    if (!req.session || !req.activeOrgId || !req.activeRole)
      throw new UnauthorizedException('No active org');
    return this.webhookService.createWebhook(
      req.session.userId,
      req.session.userEmail,
      req.activeOrgId,
      req.activeRole,
      dto.name,
      dto.url,
      dto.events,
    );
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Req() req: AuthRequest) {
    if (!req.session || !req.activeOrgId || !req.activeRole)
      throw new UnauthorizedException('No active org');
    return this.webhookService.deleteWebhook(
      req.session.userId,
      req.session.userEmail,
      req.activeOrgId,
      req.activeRole,
      id,
    );
  }
}
