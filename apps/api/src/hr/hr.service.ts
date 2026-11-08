// SPDX-License-Identifier: AGPL-3.0-or-later
import { Injectable, Inject } from '@nestjs/common';
import type postgres from 'postgres';
import { DB_CONNECTION } from '../db/db.module';
import { withOrgContext } from '@portal/db';
import { AppError, ERROR_CODES } from '@portal/shared';
import type { OrgRole } from '@portal/shared';

@Injectable()
export class HrService {
  constructor(@Inject(DB_CONNECTION) private readonly sql: postgres.Sql) {}

  async getMyBalance(userId: string, userEmail: string, orgId: string, _role: OrgRole) {
    const currentYear = new Date().getFullYear();
    return withOrgContext(this.sql, { userId, userEmail, orgId }, async (tx) => {
      // Upsert: Create balance if it doesn't exist for this year
      const [balance] = await tx`
        INSERT INTO leave_balances (organization_id, user_id, year, total_days, used_days)
        VALUES (${orgId}, ${userId}, ${currentYear}, 12, 0)
        ON CONFLICT (organization_id, user_id, year)
        DO UPDATE SET updated_at = now()
        RETURNING total_days, used_days
      `;
      return balance;
    });
  }

  async listMyLeaves(userId: string, userEmail: string, orgId: string, _role: OrgRole) {
    return withOrgContext(this.sql, { userId, userEmail, orgId }, async (tx) => {
      return tx`
        SELECT id, type, to_char(start_date, 'YYYY-MM-DD') AS start_date, to_char(end_date, 'YYYY-MM-DD') AS end_date, reason, status, created_at
        FROM leave_requests
        WHERE organization_id = ${orgId} AND user_id = ${userId}
        ORDER BY created_at DESC
      `;
    });
  }

  async createLeave(
    userId: string,
    userEmail: string,
    orgId: string,
    _role: OrgRole,
    type: string,
    startDate: string,
    endDate: string,
    reason: string,
  ) {
    return withOrgContext(this.sql, { userId, userEmail, orgId }, async (tx) => {
      const [leave] = await tx`
        INSERT INTO leave_requests (organization_id, user_id, type, start_date, end_date, reason)
        VALUES (${orgId}, ${userId}, ${type}, ${startDate}, ${endDate}, ${reason})
        RETURNING id, status
      `;
      return leave;
    });
  }

  async listAllLeaves(userId: string, userEmail: string, orgId: string, role: OrgRole) {
    if (role !== 'owner' && role !== 'admin' && role !== 'manager') {
      throw new AppError(ERROR_CODES.FORBIDDEN, 'Only managers can view all leaves', 403);
    }
    return withOrgContext(this.sql, { userId, userEmail, orgId }, async (tx) => {
      return tx`
        SELECT l.id, u.name AS employee_name, l.type, to_char(l.start_date, 'YYYY-MM-DD') AS start_date, to_char(l.end_date, 'YYYY-MM-DD') AS end_date, l.reason, l.status
        FROM leave_requests l
        JOIN users u ON u.id = l.user_id
        WHERE l.organization_id = ${orgId}
        ORDER BY l.created_at DESC
      `;
    });
  }

  async updateLeaveStatus(
    userId: string,
    userEmail: string,
    orgId: string,
    role: OrgRole,
    leaveId: string,
    status: 'approved' | 'rejected',
  ) {
    if (role !== 'owner' && role !== 'admin' && role !== 'manager') {
      throw new AppError(ERROR_CODES.FORBIDDEN, 'Only managers can approve leaves', 403);
    }
    return withOrgContext(this.sql, { userId, userEmail, orgId }, async (tx) => {
      const [leave] = await tx<
        { id: string; user_id: string; start_date: string; end_date: string }[]
      >`
        UPDATE leave_requests
        SET status = ${status}, approved_by_user_id = ${userId}, updated_at = now()
        WHERE id = ${leaveId} AND organization_id = ${orgId}
        RETURNING id, user_id, start_date, end_date
      `;
      if (!leave) throw new AppError(ERROR_CODES.NOT_FOUND, 'Leave request not found', 404);

      // If approved, update the balance
      if (status === 'approved') {
        const start = new Date(leave.start_date);
        const end = new Date(leave.end_date);
        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1;

        await tx`
          UPDATE leave_balances
          SET used_days = used_days + ${days}, updated_at = now()
          WHERE organization_id = ${orgId} AND user_id = ${leave.user_id} AND year = ${start.getFullYear()}
        `;
      }

      return { ok: true };
    });
  }
}
