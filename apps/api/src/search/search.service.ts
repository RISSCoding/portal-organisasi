// SPDX-License-Identifier: AGPL-3.0-or-later
import { Injectable, Inject } from '@nestjs/common';
import type postgres from 'postgres';
import { DB_CONNECTION } from '../db/db.module';
import { withOrgContext } from '@portal/db';

@Injectable()
export class SearchService {
  constructor(@Inject(DB_CONNECTION) private readonly sql: postgres.Sql) {}

  async search(userId: string, userEmail: string, orgId: string, query: string) {
    return withOrgContext(this.sql, { userId, userEmail, orgId }, async (tx) => {
      // websearch_to_tsquery lebih ramah pengguna (mendukung "frasa" dan -pengecualian)
      const tasks = await tx`
        SELECT id, title, 'task' as type, status
        FROM tasks
        WHERE organization_id = ${orgId} AND search_vector @@ websearch_to_tsquery('simple', ${query})
        LIMIT 10
      `;

      const documents = await tx`
        SELECT id, title, 'document' as type, null as status
        FROM documents
        WHERE organization_id = ${orgId} AND search_vector @@ websearch_to_tsquery('simple', ${query})
        LIMIT 10
      `;

      return { tasks, documents };
    });
  }
}
