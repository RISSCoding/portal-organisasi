// SPDX-License-Identifier: AGPL-3.0-or-later
import { Injectable, Inject } from '@nestjs/common';
import { randomBytes, createHash } from 'node:crypto';
import type postgres from 'postgres';
import { DB_CONNECTION } from '../db/db.module';

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

export interface SessionRecord {
  id: string;
  userId: string;
  userEmail: string;
  activeOrganizationId: string | null;
  mfaPending: boolean;
  expires: Date;
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class SessionService {
  constructor(@Inject(DB_CONNECTION) private readonly sql: postgres.Sql) {}

  async create(
    userId: string,
    meta: { ip?: string | undefined; userAgent?: string | undefined },
  ): Promise<{ token: string; expires: Date }> {
    const token = randomBytes(32).toString('base64url');
    const expires = new Date(Date.now() + SESSION_TTL_MS);
    await this.sql`
      INSERT INTO sessions (session_token_hash, user_id, expires, mfa_pending, ip, user_agent)
      VALUES (${hashToken(token)}, ${userId}, ${expires}, false, ${meta.ip ?? null}, ${meta.userAgent ?? null})
    `;
    return { token, expires };
  }

  async validate(token: string): Promise<SessionRecord | null> {
    const [row] = await this.sql<
      {
        id: string;
        user_id: string;
        email: string;
        active_organization_id: string | null;
        mfa_pending: boolean;
        expires: Date;
      }[]
    >`
      SELECT s.id, s.user_id, u.email, s.active_organization_id, s.mfa_pending, s.expires
      FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.session_token_hash = ${hashToken(token)} AND s.expires > now()
    `;
    if (!row) return null;
    return {
      id: row.id,
      userId: row.user_id,
      userEmail: row.email,
      activeOrganizationId: row.active_organization_id,
      mfaPending: row.mfa_pending,
      expires: row.expires,
    };
  }

  async markMfaVerified(sessionId: string): Promise<void> {
    await this
      .sql`UPDATE sessions SET mfa_pending = false, mfa_verified_at = now() WHERE id = ${sessionId}`;
  }

  async destroy(token: string): Promise<void> {
    await this.sql`DELETE FROM sessions WHERE session_token_hash = ${hashToken(token)}`;
  }

  async revalidateActiveOrg(session: SessionRecord): Promise<SessionRecord> {
    if (!session.activeOrganizationId) return session;

    // PENTING: Bungkus dengan set_config agar RLS mengizinkan pengecekan membership
    const [ok] = await this.sql.begin(async (tx) => {
      await tx`SELECT set_config('app.current_user_id', ${session.userId}, true)`;
      await tx`SELECT set_config('app.current_user_email', ${session.userEmail}, true)`;
      await tx`SELECT set_config('app.current_organization_id', ${session.activeOrganizationId}, true)`;
      return tx`
        SELECT 1 FROM memberships 
        WHERE user_id = ${session.userId} AND organization_id = ${session.activeOrganizationId} AND status = 'active' 
        LIMIT 1
      `;
    });

    if (!ok) {
      await this.sql`UPDATE sessions SET active_organization_id = NULL WHERE id = ${session.id}`;
      return { ...session, activeOrganizationId: null };
    }
    return session;
  }

  async setActiveOrg(sessionId: string, userId: string, orgId: string): Promise<void> {
    // PENTING: Bungkus dengan set_config agar RLS mengizinkan pengecekan membership
    const [m] = await this.sql.begin(async (tx) => {
      await tx`SELECT set_config('app.current_user_id', ${userId}, true)`;
      await tx`SELECT set_config('app.current_organization_id', ${orgId}, true)`;
      return tx`
        SELECT 1 FROM memberships 
        WHERE user_id = ${userId} AND organization_id = ${orgId} AND status = 'active' 
        LIMIT 1
      `;
    });

    if (!m) throw new Error('not a member');
    await this.sql`UPDATE sessions SET active_organization_id = ${orgId} WHERE id = ${sessionId}`;
  }
}
