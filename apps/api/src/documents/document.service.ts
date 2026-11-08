// SPDX-License-Identifier: AGPL-3.0-or-later
import { Injectable, Inject } from '@nestjs/common';
import type postgres from 'postgres';
import { DB_CONNECTION } from '../db/db.module';
import { withOrgContext } from '@portal/db';
import { can } from '@portal/auth';
import { AppError, ERROR_CODES } from '@portal/shared';
import type { OrgRole } from '@portal/shared';

@Injectable()
export class DocumentService {
  constructor(@Inject(DB_CONNECTION) private readonly sql: postgres.Sql) {}

  async listByProject(
    userId: string,
    userEmail: string,
    orgId: string,
    role: OrgRole,
    projectId: string,
  ) {
    if (!can(role, 'document', 'read')) {
      throw new AppError(ERROR_CODES.FORBIDDEN, 'Cannot read documents', 403);
    }
    return withOrgContext(this.sql, { userId, userEmail, orgId }, async (tx) => {
      return tx`
        SELECT id, title, version, created_at, updated_at
        FROM documents
        WHERE organization_id = ${orgId} AND project_id = ${projectId} AND archived_at IS NULL
        ORDER BY updated_at DESC
      `;
    });
  }

  async getById(
    userId: string,
    userEmail: string,
    orgId: string,
    role: OrgRole,
    documentId: string,
  ) {
    if (!can(role, 'document', 'read')) {
      throw new AppError(ERROR_CODES.FORBIDDEN, 'Cannot read document', 403);
    }
    return withOrgContext(this.sql, { userId, userEmail, orgId }, async (tx) => {
      const [doc] = await tx`
        SELECT id, title, content, version, created_at, updated_at
        FROM documents
        WHERE id = ${documentId} AND organization_id = ${orgId} AND archived_at IS NULL
      `;
      if (!doc) throw new AppError(ERROR_CODES.NOT_FOUND, 'Document not found', 404);
      return doc;
    });
  }

  async create(
    userId: string,
    userEmail: string,
    orgId: string,
    role: OrgRole,
    projectId: string,
    title: string,
    content: string,
  ) {
    if (!can(role, 'document', 'create')) {
      throw new AppError(ERROR_CODES.FORBIDDEN, 'Cannot create document', 403);
    }
    return withOrgContext(this.sql, { userId, userEmail, orgId }, async (tx) => {
      const [proj] = await tx<
        { id: string }[]
      >`SELECT id FROM projects WHERE id = ${projectId} AND organization_id = ${orgId}`;
      if (!proj) throw new AppError(ERROR_CODES.NOT_FOUND, 'Project not found', 404);

      const [doc] = await tx<{ id: string; title: string; version: number }[]>`
        INSERT INTO documents (organization_id, project_id, title, content, created_by_user_id)
        VALUES (${orgId}, ${projectId}, ${title}, ${content}, ${userId})
        RETURNING id, title, version
      `;

      await tx`
        INSERT INTO audit_logs (organization_id, actor_user_id, action, resource_type, resource_id)
        VALUES (${orgId}, ${userId}, 'document.create', 'document', ${doc!.id})
      `;
      return doc!;
    });
  }

  async update(
    userId: string,
    userEmail: string,
    orgId: string,
    role: OrgRole,
    documentId: string,
    title?: string,
    content?: string,
  ) {
    if (!can(role, 'document', 'update')) {
      throw new AppError(ERROR_CODES.FORBIDDEN, 'Cannot update document', 403);
    }
    return withOrgContext(this.sql, { userId, userEmail, orgId }, async (tx) => {
      const [existing] = await tx<{ version: number }[]>`
        SELECT version FROM documents WHERE id = ${documentId} AND organization_id = ${orgId} AND archived_at IS NULL
      `;
      if (!existing) throw new AppError(ERROR_CODES.NOT_FOUND, 'Document not found', 404);

      const [doc] = await tx<{ id: string; title: string; version: number }[]>`
        UPDATE documents
        SET
          title = COALESCE(${title ?? null}, title),
          content = COALESCE(${content ?? null}, content),
          version = version + 1,
          updated_by_user_id = ${userId},
          updated_at = now()
        WHERE id = ${documentId} AND organization_id = ${orgId}
        RETURNING id, title, version
      `;

      await tx`
        INSERT INTO audit_logs (organization_id, actor_user_id, action, resource_type, resource_id)
        VALUES (${orgId}, ${userId}, 'document.update', 'document', ${documentId})
      `;
      return doc!;
    });
  }

  async delete(
    userId: string,
    userEmail: string,
    orgId: string,
    role: OrgRole,
    documentId: string,
  ) {
    if (!can(role, 'document', 'delete')) {
      throw new AppError(ERROR_CODES.FORBIDDEN, 'Cannot delete document', 403);
    }
    return withOrgContext(this.sql, { userId, userEmail, orgId }, async (tx) => {
      const [doc] = await tx<{ id: string }[]>`
        DELETE FROM documents WHERE id = ${documentId} AND organization_id = ${orgId} RETURNING id
      `;
      if (!doc) throw new AppError(ERROR_CODES.NOT_FOUND, 'Document not found', 404);

      await tx`
        INSERT INTO audit_logs (organization_id, actor_user_id, action, resource_type, resource_id)
        VALUES (${orgId}, ${userId}, 'document.delete', 'document', ${documentId})
      `;
      return { ok: true };
    });
  }
}
