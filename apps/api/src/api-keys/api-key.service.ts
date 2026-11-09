// SPDX-License-Identifier: AGPL-3.0-or-later
import { Injectable, Inject } from '@nestjs/common';
import type postgres from 'postgres';
import { randomBytes, createHash } from 'node:crypto';
import { DB_CONNECTION } from '../db/db.module';
import { withOrgContext } from '@portal/db';
import { can } from '@portal/auth';
import { AppError, ERROR_CODES } from '@portal/shared';
import type { OrgRole } from '@portal/shared';
import type { SessionRecord } from '../auth/session.service';

@Injectable()
export class ApiKeyService {
  constructor(@Inject(DB_CONNECTION) private readonly sql: postgres.Sql) {}

  async createKey(userId: string, userEmail: string, orgId: string, role: OrgRole, name: string) {
    if (!can(role, 'policy', 'update')) {
      throw new AppError(ERROR_CODES.FORBIDDEN, 'Only admins can create API keys', 403);
    }

    const rawKey = `pk_live_${randomBytes(24).toString('base64url')}`;
    const prefix = rawKey.substring(0, 12);
    const keyHash = createHash('sha256').update(rawKey).digest('hex');

    await withOrgContext(this.sql, { userId, userEmail, orgId }, async (tx) => {
      await tx`
        INSERT INTO api_keys (organization_id, user_id, name, prefix, key_hash)
        VALUES (${orgId}, ${userId}, ${name}, ${prefix}, ${keyHash})
      `;
    });

    return { key: rawKey, prefix };
  }

  async listKeys(userId: string, userEmail: string, orgId: string, role: OrgRole) {
    if (!can(role, 'policy', 'read')) {
      throw new AppError(ERROR_CODES.FORBIDDEN, 'Cannot list API keys', 403);
    }
    return withOrgContext(this.sql, { userId, userEmail, orgId }, async (tx) => {
      return tx`
        SELECT id, name, prefix, last_used_at, expires_at, created_at
        FROM api_keys
        WHERE organization_id = ${orgId}
        ORDER BY created_at DESC
      `;
    });
  }

  async validateKey(rawKey: string): Promise<SessionRecord | null> {
    const keyHash = createHash('sha256').update(rawKey).digest('hex');

    const [key] = await this.sql<
      {
        id: string;
        organization_id: string;
        user_id: string;
        email: string;
        expires_at: Date | null;
      }[]
    >`
      SELECT id, organization_id, user_id, email, expires_at
      FROM app.validate_api_key(${keyHash})
    `;

    if (!key) return null;
    if (key.expires_at && new Date(key.expires_at) < new Date()) return null;

    void this.sql`UPDATE api_keys SET last_used_at = now() WHERE id = ${key.id}`;

    return {
      id: key.id,
      userId: key.user_id,
      userEmail: key.email,
      activeOrganizationId: key.organization_id,
      mfaPending: false,
      expires: key.expires_at ?? new Date(Date.now() + 1000 * 60 * 60 * 24),
    };
  }
}
