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
import { IsString, IsNumber, IsOptional, IsUUID, IsIn, Min } from 'class-validator';
import { FinanceService } from './finance.service';
import type { AuthRequest } from '../auth/tenant.middleware';

class CreateBudgetDto {
  @IsString() name!: string;
  @IsNumber() @Min(0) amount!: number;
}

class CreateExpenseDto {
  @IsOptional() @IsUUID() budgetId?: string;
  @IsString() title!: string;
  @IsNumber() @Min(0) amount!: number;
  @IsOptional() @IsString() receiptUrl?: string;
}

class UpdateExpenseStatusDto {
  @IsIn(['approved', 'rejected']) status!: 'approved' | 'rejected';
}

@Controller('finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  // Budgets
  @Get('budgets')
  async listBudgets(@Req() req: AuthRequest) {
    if (!req.session || !req.activeOrgId || !req.activeRole)
      throw new UnauthorizedException('No active org');
    return this.financeService.listBudgets(
      req.session.userId,
      req.session.userEmail,
      req.activeOrgId,
      req.activeRole,
    );
  }

  @Post('budgets')
  async createBudget(@Body() dto: CreateBudgetDto, @Req() req: AuthRequest) {
    if (!req.session || !req.activeOrgId || !req.activeRole)
      throw new UnauthorizedException('No active org');
    return this.financeService.createBudget(
      req.session.userId,
      req.session.userEmail,
      req.activeOrgId,
      req.activeRole,
      dto.name,
      dto.amount,
    );
  }

  // Expenses
  @Get('expenses/my')
  async listMyExpenses(@Req() req: AuthRequest) {
    if (!req.session || !req.activeOrgId || !req.activeRole)
      throw new UnauthorizedException('No active org');
    return this.financeService.listMyExpenses(
      req.session.userId,
      req.session.userEmail,
      req.activeOrgId,
    );
  }

  @Get('expenses/all')
  async listAllExpenses(@Req() req: AuthRequest) {
    if (!req.session || !req.activeOrgId || !req.activeRole)
      throw new UnauthorizedException('No active org');
    return this.financeService.listAllExpenses(
      req.session.userId,
      req.session.userEmail,
      req.activeOrgId,
      req.activeRole,
    );
  }

  @Post('expenses')
  async createExpense(@Body() dto: CreateExpenseDto, @Req() req: AuthRequest) {
    if (!req.session || !req.activeOrgId || !req.activeRole)
      throw new UnauthorizedException('No active org');
    return this.financeService.createExpense(
      req.session.userId,
      req.session.userEmail,
      req.activeOrgId,
      dto.budgetId ?? null,
      dto.title,
      dto.amount,
      dto.receiptUrl,
    );
  }

  @Patch('expenses/:id/status')
  async updateExpenseStatus(
    @Param('id') id: string,
    @Body() dto: UpdateExpenseStatusDto,
    @Req() req: AuthRequest,
  ) {
    if (!req.session || !req.activeOrgId || !req.activeRole)
      throw new UnauthorizedException('No active org');
    return this.financeService.updateExpenseStatus(
      req.session.userId,
      req.session.userEmail,
      req.activeOrgId,
      req.activeRole,
      id,
      dto.status,
    );
  }
}
