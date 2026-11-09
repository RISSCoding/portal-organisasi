// SPDX-License-Identifier: AGPL-3.0-or-later
import { Injectable, Inject } from '@nestjs/common';
import type postgres from 'postgres';
import { DB_CONNECTION } from '../db/db.module';
import { withOrgContext } from '@portal/db';
import { can } from '@portal/auth';
import { AppError, ERROR_CODES } from '@portal/shared';
import type { OrgRole } from '@portal/shared';
import { WebhookService } from '../webhooks/webhook.service';

@Injectable()
export class TaskService {
  constructor(
    @Inject(DB_CONNECTION) private readonly sql: postgres.Sql,
    private readonly webhooks: WebhookService,
  ) {}

  async listByProject(
    userId: string,
    userEmail: string,
    orgId: string,
    role: OrgRole,
    projectId: string,
  ) {
    if (!can(role, 'task', 'read')) {
      throw new AppError(ERROR_CODES.FORBIDDEN, 'Cannot read tasks', 403);
    }
    return withOrgContext(this.sql, { userId, userEmail, orgId }, async (tx) => {
      return tx`
        SELECT id, title, status, priority, assignee_user_id, parent_task_id, created_at
        FROM tasks
        WHERE organization_id = ${orgId} AND project_id = ${projectId}
        ORDER BY created_at ASC
      `;
    });
  }

  async create(
    userId: string,
    userEmail: string,
    orgId: string,
    role: OrgRole,
    projectId: string,
    title: string,
    parentTaskId?: string,
  ) {
    if (!can(role, 'task', 'create')) {
      throw new AppError(ERROR_CODES.FORBIDDEN, 'Cannot create task', 403);
    }
    const task = await withOrgContext(this.sql, { userId, userEmail, orgId }, async (tx) => {
      const [proj] = await tx<
        { id: string }[]
      >`SELECT id FROM projects WHERE id = ${projectId} AND organization_id = ${orgId}`;
      if (!proj) throw new AppError(ERROR_CODES.NOT_FOUND, 'Project not found', 404);

      const [createdTask] = await tx<
        { id: string; title: string; status: string; parent_task_id: string | null }[]
      >`
        INSERT INTO tasks (organization_id, project_id, title, parent_task_id, created_by_user_id)
        VALUES (${orgId}, ${projectId}, ${title}, ${parentTaskId ?? null}, ${userId})
        RETURNING id, title, status, parent_task_id
      `;

      await tx`
        INSERT INTO audit_logs (organization_id, actor_user_id, action, resource_type, resource_id)
        VALUES (${orgId}, ${userId}, 'task.create', 'task', ${createdTask!.id})
      `;
      return createdTask!;
    });

    // Dispatch webhook event (fire and forget)
    void this.webhooks.dispatchEvent(orgId, userId, userEmail, 'task.created', {
      taskId: task.id,
      title: task.title,
      createdBy: userId,
    });

    return task;
  }

  async update(
    userId: string,
    userEmail: string,
    orgId: string,
    role: OrgRole,
    taskId: string,
    updates: { title?: string; status?: string; priority?: string },
  ) {
    if (!can(role, 'task', 'update')) {
      throw new AppError(ERROR_CODES.FORBIDDEN, 'Cannot update task', 403);
    }
    return withOrgContext(this.sql, { userId, userEmail, orgId }, async (tx) => {
      const [task] = await tx<{ id: string; title: string; status: string; priority: string }[]>`
        UPDATE tasks
        SET
          title = COALESCE(${updates.title ?? null}, title),
          status = COALESCE(${updates.status ?? null}, status),
          priority = COALESCE(${updates.priority ?? null}, priority),
          updated_at = now()
        WHERE id = ${taskId} AND organization_id = ${orgId}
        RETURNING id, title, status, priority
      `;
      if (!task) throw new AppError(ERROR_CODES.NOT_FOUND, 'Task not found', 404);

      await tx`
        INSERT INTO audit_logs (organization_id, actor_user_id, action, resource_type, resource_id)
        VALUES (${orgId}, ${userId}, 'task.update', 'task', ${taskId})
      `;
      return task;
    });
  }

  async delete(userId: string, userEmail: string, orgId: string, role: OrgRole, taskId: string) {
    if (!can(role, 'task', 'delete')) {
      throw new AppError(ERROR_CODES.FORBIDDEN, 'Cannot delete task', 403);
    }
    return withOrgContext(this.sql, { userId, userEmail, orgId }, async (tx) => {
      const [task] = await tx<{ id: string }[]>`
        DELETE FROM tasks WHERE id = ${taskId} AND organization_id = ${orgId} RETURNING id
      `;
      if (!task) throw new AppError(ERROR_CODES.NOT_FOUND, 'Task not found', 404);

      await tx`
        INSERT INTO audit_logs (organization_id, actor_user_id, action, resource_type, resource_id)
        VALUES (${orgId}, ${userId}, 'task.delete', 'task', ${taskId})
      `;
      return { ok: true };
    });
  }
}
