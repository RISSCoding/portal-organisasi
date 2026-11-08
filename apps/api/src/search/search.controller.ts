// SPDX-License-Identifier: AGPL-3.0-or-later
import { Controller, Get, Query, Req, UnauthorizedException } from '@nestjs/common';
import { SearchService } from './search.service';
import type { AuthRequest } from '../auth/tenant.middleware';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  async search(@Query('q') query: string, @Req() req: AuthRequest) {
    if (!req.session || !req.activeOrgId || !req.activeRole) {
      throw new UnauthorizedException('No active organization');
    }
    if (!query || query.trim().length === 0) {
      return { tasks: [], documents: [] };
    }
    return this.searchService.search(
      req.session.userId,
      req.session.userEmail,
      req.activeOrgId,
      query,
    );
  }
}
