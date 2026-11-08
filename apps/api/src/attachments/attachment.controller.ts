// SPDX-License-Identifier: AGPL-3.0-or-later
import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { IsString, IsUUID, IsIn, IsNumber, MinLength } from 'class-validator';
import { AttachmentService } from './attachment.service';
import type { AuthRequest } from '../auth/tenant.middleware';

class UploadUrlDto {
  @IsString() @MinLength(1) fileName!: string;
  @IsString() @MinLength(1) mimeType!: string;
  @IsUUID() targetId!: string;
  @IsIn(['task', 'document']) targetType!: 'task' | 'document';
}

class ConfirmUploadDto extends UploadUrlDto {
  @IsNumber() fileSize!: number;
  @IsString() storageKey!: string;
}

@Controller('attachments')
export class AttachmentController {
  constructor(private readonly attachmentService: AttachmentService) {}

  @Post('upload-url')
  async getUploadUrl(@Body() dto: UploadUrlDto, @Req() req: AuthRequest) {
    if (!req.session || !req.activeOrgId || !req.activeRole)
      throw new UnauthorizedException('No active org');
    return this.attachmentService.generateUploadUrl(
      req.session.userId,
      req.session.userEmail,
      req.activeOrgId,
      req.activeRole,
      dto.fileName,
      dto.mimeType,
      dto.targetId,
      dto.targetType,
    );
  }

  @Post('confirm')
  async confirmUpload(@Body() dto: ConfirmUploadDto, @Req() req: AuthRequest) {
    if (!req.session || !req.activeOrgId || !req.activeRole)
      throw new UnauthorizedException('No active org');
    return this.attachmentService.confirmUpload(
      req.session.userId,
      req.session.userEmail,
      req.activeOrgId,
      req.activeRole,
      dto.fileName,
      dto.mimeType,
      dto.fileSize,
      dto.storageKey,
      dto.targetId,
      dto.targetType,
    );
  }

  @Get()
  async listByTarget(
    @Query('targetId') targetId: string,
    @Query('targetType') targetType: 'task' | 'document',
    @Req() req: AuthRequest,
  ) {
    if (!req.session || !req.activeOrgId || !req.activeRole)
      throw new UnauthorizedException('No active org');
    return this.attachmentService.listByTarget(
      req.session.userId,
      req.session.userEmail,
      req.activeOrgId,
      req.activeRole,
      targetId,
      targetType,
    );
  }

  @Get(':id/download')
  async download(@Param('id') id: string, @Req() req: AuthRequest) {
    if (!req.session || !req.activeOrgId || !req.activeRole)
      throw new UnauthorizedException('No active org');
    return this.attachmentService.getDownloadUrl(
      req.session.userId,
      req.session.userEmail,
      req.activeOrgId,
      req.activeRole,
      id,
    );
  }
}
