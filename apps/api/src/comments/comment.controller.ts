// SPDX-License-Identifier: AGPL-3.0-or-later
import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { IsString, IsUUID, MinLength, IsIn } from 'class-validator';
import { CommentService } from './comment.service';
import type { AuthRequest } from '../auth/tenant.middleware';

class CreateCommentDto {
  @IsUUID() targetId!: string;
  @IsIn(['task', 'document']) targetType!: 'task' | 'document';
  @IsString() @MinLength(1) content!: string;
}

@Controller('comments')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Get()
  async list(
    @Query('targetId') targetId: string,
    @Query('targetType') targetType: 'task' | 'document',
    @Req() req: AuthRequest,
  ) {
    if (!req.session || !req.activeOrgId || !req.activeRole)
      throw new UnauthorizedException('No active org');
    return this.commentService.list(
      req.session.userId,
      req.session.userEmail,
      req.activeOrgId,
      req.activeRole,
      targetId,
      targetType,
    );
  }

  @Post()
  async create(@Body() dto: CreateCommentDto, @Req() req: AuthRequest) {
    if (!req.session || !req.activeOrgId || !req.activeRole)
      throw new UnauthorizedException('No active org');
    return this.commentService.create(
      req.session.userId,
      req.session.userEmail,
      req.activeOrgId,
      req.activeRole,
      dto.targetId,
      dto.targetType,
      dto.content,
    );
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Req() req: AuthRequest) {
    if (!req.session || !req.activeOrgId || !req.activeRole)
      throw new UnauthorizedException('No active org');
    return this.commentService.delete(
      req.session.userId,
      req.session.userEmail,
      req.activeOrgId,
      req.activeRole,
      id,
    );
  }
}
