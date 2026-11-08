// SPDX-License-Identifier: AGPL-3.0-or-later
import { Injectable, Inject } from '@nestjs/common';
import type postgres from 'postgres';
import { DB_CONNECTION } from '../db/db.module';
import { withOrgContext } from '@portal/db';
import { can } from '@portal/auth';
import { AppError, ERROR_CODES } from '@portal/shared';
import type { OrgRole } from '@portal/shared';

@Injectable()
export class FinanceService {
  constructor(@Inject(DB_CONNECTION) private readonly sql: postgres.Sql) {}

  // ── BUDGETS ──────────────────────────────────────────────────────────────

  async listBudgets(userId: string, userEmail: string, orgId: string, role: OrgRole) {
    if (!can(role, 'policy', 'read')) {
      throw new AppError(ERROR_CODES.FORBIDDEN, 'Cannot read budgets', 403);
    }
    return withOrgContext(this.sql, { userId, userEmail, orgId }, async (tx) => {
      return tx`
        SELECT b.id, b.name, b.amount, b.created_at,
               COALESCE(SUM(e.amount), 0) as used_amount
        FROM budgets b
        LEFT JOIN expenses e ON e.budget_id = b.id AND e.status = 'approved'
        WHERE b.organization_id = ${orgId}
        GROUP BY b.id
        ORDER BY b.created_at DESC
      `;
    });
  }

  async createBudget(
    userId: string,
    userEmail: string,
    orgId: string,
    role: OrgRole,
    name: string,
    amount: number,
  ) {
    if (!can(role, 'policy', 'update')) {
      throw new AppError(ERROR_CODES.FORBIDDEN, 'Cannot create budget', 403);
    }
    return withOrgContext(this.sql, { userId, userEmail, orgId }, async (tx) => {
      const [budget] = await tx<{ id: string }[]>`
        INSERT INTO budgets (organization_id, name, amount, created_by_user_id)
        VALUES (${orgId}, ${name}, ${amount}, ${userId})
        RETURNING id
      `;
      return budget!;
    });
  }

  // ── EXPENSES ─────────────────────────────────────────────────────────────

  async listMyExpenses(userId: string, userEmail: string, orgId: string) {
    return withOrgContext(this.sql, { userId, userEmail, orgId }, async (tx) => {
      return tx`
        SELECT e.id, e.title, e.amount, e.status, e.created_at, b.name as budget_name
        FROM expenses e
        LEFT JOIN budgets b ON b.id = e.budget_id
        WHERE e.organization_id = ${orgId} AND e.requester_user_id = ${userId}
        ORDER BY e.created_at DESC
      `;
    });
  }

  async createExpense(
    userId: string,
    userEmail: string,
    orgId: string,
    budgetId: string | null,
    title: string,
    amount: number,
    receiptUrl?: string,
  ) {
    return withOrgContext(this.sql, { userId, userEmail, orgId }, async (tx) => {
      const [expense] = await tx<{ id: string }[]>`
        INSERT INTO expenses (organization_id, budget_id, requester_user_id, title, amount, receipt_url)
        VALUES (${orgId}, ${budgetId}, ${userId}, ${title}, ${amount}, ${receiptUrl ?? null})
        RETURNING id
      `;
      return expense!;
    });
  }

  async listAllExpenses(userId: string, userEmail: string, orgId: string, role: OrgRole) {
    if (!can(role, 'policy', 'read')) {
      throw new AppError(ERROR_CODES.FORBIDDEN, 'Cannot view all expenses', 403);
    }
    return withOrgContext(this.sql, { userId, userEmail, orgId }, async (tx) => {
      return tx`
        SELECT e.id, u.name AS requester_name, e.title, e.amount, e.status, e.created_at, b.name as budget_name
        FROM expenses e
        JOIN users u ON u.id = e.requester_user_id
        LEFT JOIN budgets b ON b.id = e.budget_id
        WHERE e.organization_id = ${orgId}
        ORDER BY e.created_at DESC
      `;
    });
  }

  async updateExpenseStatus(
    userId: string,
    userEmail: string,
    orgId: string,
    role: OrgRole,
    expenseId: string,
    status: 'approved' | 'rejected',
  ) {
    if (!can(role, 'policy', 'update')) {
      throw new AppError(ERROR_CODES.FORBIDDEN, 'Cannot approve expenses', 403);
    }
    return withOrgContext(this.sql, { userId, userEmail, orgId }, async (tx) => {
      const [expense] = await tx<{ id: string }[]>`
        UPDATE expenses
        SET status = ${status}, updated_at = now()
        WHERE id = ${expenseId} AND organization_id = ${orgId}
        RETURNING id
      `;
      if (!expense) throw new AppError(ERROR_CODES.NOT_FOUND, 'Expense not found', 404);
      return { ok: true };
    });
  }
}
