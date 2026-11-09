// SPDX-License-Identifier: AGPL-3.0-or-later
import { Injectable, Inject } from '@nestjs/common';
import type postgres from 'postgres';
import { randomBytes } from 'node:crypto';
import { DB_CONNECTION } from '../db/db.module';
import { withOrgContext } from '@portal/db';
import { can } from '@portal/auth';
import { AppError, ERROR_CODES } from '@portal/shared';
import type { OrgRole } from '@portal/shared';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

@Injectable()
export class WebhookService {
  private webhookQueue: Queue;

  constructor(@Inject(DB_CONNECTION) private readonly sql: postgres.Sql) {
    const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
    });
    this.webhookQueue = new Queue('webhook', { connection });
  }

  async createWebhook(
    userId: string,
    userEmail: string,
    orgId: string,
    role: OrgRole,
    name: string,
    url: string,
    events: string[],
  ) {
    if (!can(role, 'policy', 'update')) {
      throw new AppError(ERROR_CODES.FORBIDDEN, 'Only admins can create webhooks', 403);
    }

    const secret = randomBytes(32).toString('base64url');

    return withOrgContext(this.sql, { userId, userEmail, orgId }, async (tx) => {
      const [webhook] = await tx<{ id: string }[]>`
        INSERT INTO webhooks (organization_id, name, url, secret, events, created_by_user_id)
        VALUES (${orgId}, ${name}, ${url}, ${secret}, ${events}, ${userId})
        RETURNING id
      `;
      return { ...webhook!, secret };
    });
  }

  async listWebhooks(userId: string, userEmail: string, orgId: string, role: OrgRole) {
    if (!can(role, 'policy', 'read')) {
      throw new AppError(ERROR_CODES.FORBIDDEN, 'Cannot list webhooks', 403);
    }
    return withOrgContext(this.sql, { userId, userEmail, orgId }, async (tx) => {
      return tx`
        SELECT id, name, url, events, is_active, created_at
        FROM webhooks
        WHERE organization_id = ${orgId}
        ORDER BY created_at DESC
      `;
    });
  }

  async deleteWebhook(
    userId: string,
    userEmail: string,
    orgId: string,
    role: OrgRole,
    webhookId: string,
  ) {
    if (!can(role, 'policy', 'update')) {
      throw new AppError(ERROR_CODES.FORBIDDEN, 'Only admins can delete webhooks', 403);
    }
    return withOrgContext(this.sql, { userId, userEmail, orgId }, async (tx) => {
      const [deleted] = await tx<{ id: string }[]>`
        DELETE FROM webhooks WHERE id = ${webhookId} AND organization_id = ${orgId} RETURNING id
      `;
      if (!deleted) throw new AppError(ERROR_CODES.NOT_FOUND, 'Webhook not found', 404);
      return { ok: true };
    });
  }

  async dispatchEvent(
    orgId: string,
    userId: string,
    userEmail: string,
    event: string,
    payload: Record<string, unknown>,
  ) {
    // Gunakan withOrgContext agar RLS mengizinkan pembacaan tabel webhooks dan insert ke webhook_deliveries
    return withOrgContext(this.sql, { userId, userEmail, orgId }, async (tx) => {
      const webhooks = await tx<{ id: string; url: string; secret: string }[]>`
        SELECT id, url, secret FROM webhooks
        WHERE organization_id = ${orgId} AND is_active = true AND ${event} = ANY(events)
      `;

      for (const hook of webhooks) {
        const [delivery] = await tx<{ id: string }[]>`
          INSERT INTO webhook_deliveries (organization_id, webhook_id, event, payload)
          VALUES (${orgId}, ${hook.id}, ${event}, ${JSON.stringify(payload)})
          RETURNING id
        `;

        await this.webhookQueue.add('deliver', {
          deliveryId: delivery!.id,
          url: hook.url,
          secret: hook.secret,
          event,
          payload,
        });
      }
    });
  }
}
