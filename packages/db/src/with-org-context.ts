// SPDX-License-Identifier: AGPL-3.0-or-later
import type postgres from 'postgres';

export interface OrgContext {
  userId: string;
  userEmail: string;
  orgId: string | null;
}

export async function withOrgContext<T>(
  sql: postgres.Sql,
  ctx: OrgContext,
  fn: (tx: postgres.TransactionSql) => Promise<T>,
): Promise<T> {
  const result = await sql.begin(async (tx) => {
    await tx`SELECT set_config('app.current_user_id', ${ctx.userId}, true)`;
    await tx`SELECT set_config('app.current_user_email', ${ctx.userEmail}, true)`;
    await tx`SELECT set_config('app.current_organization_id', ${ctx.orgId ?? ''}, true)`;
    return fn(tx);
  });
  return result;
}
