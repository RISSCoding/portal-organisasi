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
import { IsString, IsUUID, MinLength, IsOptional } from 'class-validator';
import { DocumentService } from './document.service';
import type { AuthRequest } from '../auth/tenant.middleware';

class CreateDocumentDto {
  @IsUUID() projectId!: string;
  @IsString() @MinLength(1) title!: string;
  @IsString() content!: string;
}

class UpdateDocumentDto {
  @IsOptional() @IsString() @MinLength(1) title?: string;
  @IsOptional() @IsString() content?: string;
}

@Controller('documents')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Get('project/:projectId')
  async listByProject(@Param('projectId') projectId: string, @Req() req: AuthRequest) {
    if (!req.session || !req.activeOrgId || !req.activeRole)
      throw new UnauthorizedException('No active org');
    return this.documentService.listByProject(
      req.session.userId,
      req.session.userEmail,
      req.activeOrgId,
      req.activeRole,
      projectId,
    );
  }

  @Get(':id')
  async getById(@Param('id') id: string, @Req() req: AuthRequest) {
    if (!req.session || !req.activeOrgId || !req.activeRole)
      throw new UnauthorizedException('No active org');
    return this.documentService.getById(
      req.session.userId,
      req.session.userEmail,
      req.activeOrgId,
      req.activeRole,
      id,
    );
  }

  @Post()
  async create(@Body() dto: CreateDocumentDto, @Req() req: AuthRequest) {
    if (!req.session || !req.activeOrgId || !req.activeRole)
      throw new UnauthorizedException('No active org');
    return this.documentService.create(
      req.session.userId,
      req.session.userEmail,
      req.activeOrgId,
      req.activeRole,
      dto.projectId,
      dto.title,
      dto.content,
    );
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateDocumentDto, @Req() req: AuthRequest) {
    if (!req.session || !req.activeOrgId || !req.activeRole)
      throw new UnauthorizedException('No active org');
    return this.documentService.update(
      req.session.userId,
      req.session.userEmail,
      req.activeOrgId,
      req.activeRole,
      id,
      dto.title,
      dto.content,
    );
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Req() req: AuthRequest) {
    if (!req.session || !req.activeOrgId || !req.activeRole)
      throw new UnauthorizedException('No active org');
    return this.documentService.delete(
      req.session.userId,
      req.session.userEmail,
      req.activeOrgId,
      req.activeRole,
      id,
    );
  }
}
