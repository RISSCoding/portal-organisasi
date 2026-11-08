// SPDX-License-Identifier: AGPL-3.0-or-later
import { Injectable, Inject } from '@nestjs/common';
import type postgres from 'postgres';
import { DB_CONNECTION } from '../db/db.module';
import { withOrgContext } from '@portal/db';
import { AppError, ERROR_CODES } from '@portal/shared';
import type { OrgRole } from '@portal/shared';

@Injectable()
export class ApprovalService {
  constructor(@Inject(DB_CONNECTION) private readonly sql: postgres.Sql) {}

  async list(userId: string, userEmail: string, orgId: string, _role: OrgRole) {
    return withOrgContext(this.sql, { userId, userEmail, orgId }, async (tx) => {
      return tx`
        SELECT id, title, status, created_at
        FROM approval_requests
        WHERE organization_id = ${orgId}
        ORDER BY created_at DESC
      `;
    });
  }

  async create(
    userId: string,
    userEmail: string,
    orgId: string,
    _role: OrgRole,
    title: string,
    description: string,
  ) {
    return withOrgContext(this.sql, { userId, userEmail, orgId }, async (tx) => {
      const [request] = await tx<{ id: string }[]>`
        INSERT INTO approval_requests (organization_id, requester_user_id, title, description)
        VALUES (${orgId}, ${userId}, ${title}, ${description})
        RETURNING id
      `;

      // Create a single default step
      await tx`
        INSERT INTO approval_steps (organization_id, approval_request_id, step_order, status)
        VALUES (${orgId}, ${request!.id}, 1, 'pending')
      `;

      return request!;
    });
  }

  async act(
    userId: string,
    userEmail: string,
    orgId: string,
    role: OrgRole,
    requestId: string,
    action: 'approve' | 'reject',
    comment?: string,
  ) {
    // Only owners and admins can approve/reject for now
    if (role !== 'owner' && role !== 'admin') {
      throw new AppError(ERROR_CODES.FORBIDDEN, 'Only owner or admin can approve', 403);
    }

    return withOrgContext(this.sql, { userId, userEmail, orgId }, async (tx) => {
      const [step] = await tx<{ id: string }[]>`
        SELECT id FROM approval_steps
        WHERE organization_id = ${orgId} AND approval_request_id = ${requestId} AND status = 'pending'
        ORDER BY step_order ASC LIMIT 1
      `;
      if (!step) throw new AppError(ERROR_CODES.NOT_FOUND, 'No pending steps found', 404);

      const newStatus = action === 'approve' ? 'approved' : 'rejected';
      await tx`
        UPDATE approval_steps
        SET status = ${newStatus}, comment = ${comment ?? null}, acted_at = now(), updated_at = now()
        WHERE id = ${step.id}
      `;

      // Update parent request status
      await tx`
        UPDATE approval_requests
        SET status = ${newStatus}, updated_at = now()
        WHERE id = ${requestId}
      `;

      return { ok: true };
    });
  }
}
