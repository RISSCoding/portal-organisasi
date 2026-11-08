// SPDX-License-Identifier: AGPL-3.0-or-later
import {
  Controller,
  Post,
  Body,
  Req,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { IsUUID } from 'class-validator';
import { SessionService } from '../auth/session.service';
import type { AuthRequest } from '../auth/tenant.middleware';

class SwitchOrgDto {
  @IsUUID() orgId!: string;
}

@Controller('auth')
export class SwitchOrgController {
  constructor(private readonly sessions: SessionService) {}

  @Post('switch-org')
  async switchOrg(@Body() dto: SwitchOrgDto, @Req() req: AuthRequest) {
    if (!req.session) throw new UnauthorizedException();
    try {
      await this.sessions.setActiveOrg(req.session.id, req.session.userId, dto.orgId);
      return { ok: true };
    } catch {
      throw new ForbiddenException('Not a member of this organization');
    }
  }
}
