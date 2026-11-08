// SPDX-License-Identifier: AGPL-3.0-or-later
// Uses Bun's built-in argon2id (Bun.password). No extra dependency.
// If the API ever needs Node compatibility, swap to `@node-rs/argon2` — the
// public surface here (hashPassword / verifyPassword) stays the same.

export async function hashPassword(password: string): Promise<string> {
  return Bun.password.hash(password, { algorithm: 'argon2id' });
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await Bun.password.verify(password, hash);
  } catch {
    // Malformed hash → never authenticate. Never log the hash.
    return false;
  }
}
