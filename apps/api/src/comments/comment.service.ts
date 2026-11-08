// SPDX-License-Identifier: AGPL-3.0-or-later
import { Injectable, Inject } from '@nestjs/common';
import type postgres from 'postgres';
import { DB_CONNECTION } from '../db/db.module';
import { withOrgContext } from '@portal/db';
import { can } from '@portal/auth';
import { AppError, ERROR_CODES } from '@portal/shared';
import type { OrgRole } from '@portal/shared';

@Injectable()
export class CommentService {
  constructor(@Inject(DB_CONNECTION) private readonly sql: postgres.Sql) {}

  async list(
    userId: string,
    userEmail: string,
    orgId: string,
    role: OrgRole,
    targetId: string,
    targetType: 'task' | 'document',
  ) {
    if (!can(role, 'comment', 'read')) {
      throw new AppError(ERROR_CODES.FORBIDDEN, 'Cannot read comments', 403);
    }
    return withOrgContext(this.sql, { userId, userEmail, orgId }, async (tx) => {
      if (targetType === 'task') {
        return tx`
          SELECT c.id, c.content, c.created_at, u.name AS author_name
          FROM comments c JOIN users u ON u.id = c.author_user_id
          WHERE c.organization_id = ${orgId} AND c.task_id = ${targetId}
          ORDER BY c.created_at ASC
        `;
      } else {
        return tx`
          SELECT c.id, c.content, c.created_at, u.name AS author_name
          FROM comments c JOIN users u ON u.id = c.author_user_id
          WHERE c.organization_id = ${orgId} AND c.document_id = ${targetId}
          ORDER BY c.created_at ASC
        `;
      }
    });
  }

  async create(
    userId: string,
    userEmail: string,
    orgId: string,
    role: OrgRole,
    targetId: string,
    targetType: 'task' | 'document',
    content: string,
  ) {
    if (!can(role, 'comment', 'create')) {
      throw new AppError(ERROR_CODES.FORBIDDEN, 'Cannot create comment', 403);
    }
    return withOrgContext(this.sql, { userId, userEmail, orgId }, async (tx) => {
      if (targetType === 'task') {
        const [t] =
          await tx`SELECT id FROM tasks WHERE id = ${targetId} AND organization_id = ${orgId}`;
        if (!t) throw new AppError(ERROR_CODES.NOT_FOUND, 'Task not found', 404);
      } else {
        const [d] =
          await tx`SELECT id FROM documents WHERE id = ${targetId} AND organization_id = ${orgId}`;
        if (!d) throw new AppError(ERROR_CODES.NOT_FOUND, 'Document not found', 404);
      }

      const [comment] = await tx<{ id: string; content: string; created_at: Date }[]>`
        INSERT INTO comments (organization_id, task_id, document_id, author_user_id, content)
        VALUES (${orgId}, ${targetType === 'task' ? targetId : null}, ${targetType === 'document' ? targetId : null}, ${userId}, ${content})
        RETURNING id, content, created_at
      `;
      return comment!;
    });
  }

  async delete(userId: string, userEmail: string, orgId: string, role: OrgRole, commentId: string) {
    if (!can(role, 'comment', 'delete')) {
      throw new AppError(ERROR_CODES.FORBIDDEN, 'Cannot delete comment', 403);
    }
    return withOrgContext(this.sql, { userId, userEmail, orgId }, async (tx) => {
      const [comment] = await tx<{ id: string; author_user_id: string }[]>`
        SELECT id, author_user_id FROM comments WHERE id = ${commentId} AND organization_id = ${orgId}
      `;
      if (!comment) throw new AppError(ERROR_CODES.NOT_FOUND, 'Comment not found', 404);

      if (comment.author_user_id !== userId && role !== 'owner' && role !== 'admin') {
        throw new AppError(ERROR_CODES.FORBIDDEN, 'Cannot delete others comments', 403);
      }

      await tx`DELETE FROM comments WHERE id = ${commentId}`;
      await tx`
        INSERT INTO audit_logs (organization_id, actor_user_id, action, resource_type, resource_id)
        VALUES (${orgId}, ${userId}, 'comment.delete', 'comment', ${commentId})
      `;
      return { ok: true };
    });
  }
}
