// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'bun:test';
import { hashPassword, verifyPassword } from './password';

describe('hashPassword', () => {
  it('produces an argon2id hash', async () => {
    const h = await hashPassword('correct horse battery staple');
    expect(h.startsWith('$argon2id$')).toBe(true);
  });

  it('produces different hashes for the same input (salt)', async () => {
    const a = await hashPassword('same-input');
    const b = await hashPassword('same-input');
    expect(a).not.toBe(b);
  });
});

describe('verifyPassword', () => {
  it('returns true for the correct password', async () => {
    const h = await hashPassword('s3cret-pw');
    expect(await verifyPassword('s3cret-pw', h)).toBe(true);
  });

  it('returns false for the wrong password', async () => {
    const h = await hashPassword('s3cret-pw');
    expect(await verifyPassword('wrong-pw', h)).toBe(false);
  });

  it('returns false (never throws) for a malformed hash', async () => {
    expect(await verifyPassword('anything', 'not-a-hash')).toBe(false);
    expect(await verifyPassword('anything', '')).toBe(false);
    expect(await verifyPassword('anything', '$argon2id$broken')).toBe(false);
  });
});
