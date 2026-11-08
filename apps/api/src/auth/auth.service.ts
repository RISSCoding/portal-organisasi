// SPDX-License-Identifier: AGPL-3.0-or-later
import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import type postgres from 'postgres';
import { authenticator } from 'otplib';
import { hashPassword, verifyPassword } from '@portal/auth';
import { AppError, ERROR_CODES } from '@portal/shared';
import { DB_CONNECTION } from '../db/db.module';
import { SessionService } from './session.service';

@Injectable()
export class AuthService {
  constructor(
    @Inject(DB_CONNECTION) private readonly sql: postgres.Sql,
    private readonly sessions: SessionService,
  ) {}

  async register(email: string, password: string, name: string) {
    const hash = await hashPassword(password);
    try {
      const [user] = await this.sql<{ id: string }[]>`
        INSERT INTO users (email, password_hash, name) VALUES (${email}, ${hash}, ${name}) RETURNING id
      `;
      return user!;
    } catch (e: unknown) {
      if (typeof e === 'object' && e !== null && 'code' in e && e.code === '23505') {
        throw new AppError(ERROR_CODES.EMAIL_TAKEN, 'Email already registered', 409);
      }
      throw e;
    }
  }

  async login(
    email: string,
    password: string,
    meta: { ip?: string | undefined; userAgent?: string | undefined },
  ) {
    const [user] = await this.sql<
      { id: string; password_hash: string | null; mfa_enabled: boolean }[]
    >`
      SELECT id, password_hash, mfa_enabled FROM users WHERE email = ${email}
    `;

    const ok = user?.password_hash ? await verifyPassword(password, user.password_hash) : false;
    if (!user || !ok)
      throw new AppError(ERROR_CODES.INVALID_CREDENTIALS, 'Invalid credentials', 401);

    const { token, expires } = await this.sessions.create(user.id, meta);

    if (user.mfa_enabled) {
      const s = await this.sessions.validate(token);
      await this.sql`UPDATE sessions SET mfa_pending = true WHERE id = ${s!.id}`;
      return { requiresMfa: true, token, expires };
    }

    return { requiresMfa: false, token, expires };
  }

  async generateMfaSecret(userId: string) {
    const secret = authenticator.generateSecret();
    await this.sql`UPDATE users SET mfa_totp_secret_encrypted = ${secret} WHERE id = ${userId}`;
    return { secret, uri: authenticator.keyuri('user', 'Portal Organisasi', secret) };
  }

  async enableMfa(userId: string, code: string) {
    const [user] = await this.sql<{ mfa_totp_secret_encrypted: string }[]>`
      SELECT mfa_totp_secret_encrypted FROM users WHERE id = ${userId}
    `;
    if (!user?.mfa_totp_secret_encrypted) throw new BadRequestException('MFA secret not generated');

    const isValid = authenticator.verify({ token: code, secret: user.mfa_totp_secret_encrypted });
    if (!isValid) throw new AppError(ERROR_CODES.MFA_INVALID, 'Invalid MFA code', 400);

    await this.sql`UPDATE users SET mfa_enabled = true WHERE id = ${userId}`;
    return { ok: true };
  }
}
