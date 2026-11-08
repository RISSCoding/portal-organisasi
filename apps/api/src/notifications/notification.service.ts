// SPDX-License-Identifier: AGPL-3.0-or-later
import { Injectable, Inject } from '@nestjs/common';
import type postgres from 'postgres';
import { DB_CONNECTION } from '../db/db.module';
import { withOrgContext } from '@portal/db';
import { AppError, ERROR_CODES } from '@portal/shared';
import type { OrgRole } from '@portal/shared';

@Injectable()
export class NotificationService {
  constructor(@Inject(DB_CONNECTION) private readonly sql: postgres.Sql) {}

  async list(userId: string, userEmail: string, orgId: string, _role: OrgRole) {
    return withOrgContext(this.sql, { userId, userEmail, orgId }, async (tx) => {
      return tx`
        SELECT id, type, title, body, is_read, created_at
        FROM notifications
        WHERE organization_id = ${orgId} AND user_id = ${userId}
        ORDER BY created_at DESC
      `;
    });
  }

  async markRead(
    userId: string,
    userEmail: string,
    orgId: string,
    _role: OrgRole,
    notificationId: string,
  ) {
    return withOrgContext(this.sql, { userId, userEmail, orgId }, async (tx) => {
      const [result] = await tx<{ id: string }[]>`
        UPDATE notifications
        SET is_read = true
        WHERE id = ${notificationId} AND organization_id = ${orgId} AND user_id = ${userId}
        RETURNING id
      `;
      if (!result) throw new AppError(ERROR_CODES.NOT_FOUND, 'Notification not found', 404);
      return { ok: true };
    });
  }

  async markAllRead(userId: string, userEmail: string, orgId: string, _role: OrgRole) {
    return withOrgContext(this.sql, { userId, userEmail, orgId }, async (tx) => {
      await tx`
        UPDATE notifications
        SET is_read = true
        WHERE organization_id = ${orgId} AND user_id = ${userId} AND is_read = false
      `;
      return { ok: true };
    });
  }
}
