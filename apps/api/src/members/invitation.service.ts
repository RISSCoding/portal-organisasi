// SPDX-License-Identifier: AGPL-3.0-or-later
import { Injectable, Inject } from '@nestjs/common';
import type postgres from 'postgres';
import { randomBytes, createHash } from 'node:crypto';
import { withOrgContext } from '@portal/db';
import { can } from '@portal/auth';
import type { OrgRole } from '@portal/shared';
import { AppError, ERROR_CODES } from '@portal/shared';
import { DB_CONNECTION } from '../db/db.module';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

@Injectable()
export class InvitationService {
  private emailQueue: Queue;

  constructor(@Inject(DB_CONNECTION) private readonly sql: postgres.Sql) {
    const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
    });
    this.emailQueue = new Queue('email', { connection });
  }

  async invite(
    userId: string,
    userEmail: string,
    orgId: string,
    role: OrgRole,
    email: string,
    inviteRole: OrgRole,
  ) {
    if (!can(role, 'member', 'invite')) {
      throw new AppError(ERROR_CODES.FORBIDDEN, 'Cannot invite members', 403);
    }

    const token = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    return withOrgContext(this.sql, { userId, userEmail, orgId }, async (tx) => {
      try {
        await tx`
          INSERT INTO invitations (organization_id, email, role, token_hash, invited_by_user_id, expires_at)
          VALUES (${orgId}, ${email}, ${inviteRole}, ${tokenHash}, ${userId}, ${expiresAt})
        `;

        // Ambil nama organisasi
        const [org] = await tx<
          { name: string }[]
        >`SELECT name FROM organizations WHERE id = ${orgId}`;

        // Masukkan job ke queue
        await this.emailQueue.add('send-invitation', {
          to: email,
          orgName: org!.name,
          token: token,
        });

        return { ok: true, token };
      } catch (e: unknown) {
        if (typeof e === 'object' && e !== null && 'code' in e && e.code === '23505') {
          throw new AppError(
            ERROR_CODES.INVITATION_EXISTS,
            'Invitation already pending for this email',
            409,
          );
        }
        throw e;
      }
    });
  }

  async accept(userId: string, userEmail: string, token: string) {
    const tokenHash = createHash('sha256').update(token).digest('hex');

    return this.sql.begin(async (tx) => {
      await tx`SELECT set_config('app.current_user_id', ${userId}, true)`;
      await tx`SELECT set_config('app.current_user_email', ${userEmail}, true)`;

      try {
        const [row] = await tx<
          { organization_id: string }[]
        >`SELECT app.accept_invitation(${tokenHash}) AS organization_id`;
        return { ok: true, orgId: row?.organization_id };
      } catch (e: unknown) {
        if (
          typeof e === 'object' &&
          e !== null &&
          'message' in e &&
          String(e.message).includes('invalid or expired invitation')
        ) {
          throw new AppError(ERROR_CODES.NOT_FOUND, 'Invalid or expired invitation', 400);
        }
        throw e;
      }
    });
  }
}
