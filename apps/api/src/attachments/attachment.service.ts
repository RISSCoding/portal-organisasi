// SPDX-License-Identifier: AGPL-3.0-or-later
import { Injectable, Inject } from '@nestjs/common';
import type postgres from 'postgres';
import { randomUUID } from 'node:crypto';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { DB_CONNECTION } from '../db/db.module';
import { withOrgContext } from '@portal/db';
import { can } from '@portal/auth';
import { AppError, ERROR_CODES } from '@portal/shared';
import type { OrgRole } from '@portal/shared';
import { s3Client, S3_BUCKET } from '../db/s3.config';

@Injectable()
export class AttachmentService {
  constructor(@Inject(DB_CONNECTION) private readonly sql: postgres.Sql) {}

  async generateUploadUrl(
    _userId: string,
    _userEmail: string,
    orgId: string,
    role: OrgRole,
    fileName: string,
    mimeType: string,
    targetId: string,
    targetType: 'task' | 'document',
  ) {
    if (!can(role, 'task', 'update')) {
      throw new AppError(ERROR_CODES.FORBIDDEN, 'Cannot upload attachments', 403);
    }

    const fileExtension = fileName.split('.').pop() || 'bin';
    const storageKey = `${orgId}/${targetType}/${targetId}/${randomUUID()}.${fileExtension}`;

    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: storageKey,
      ContentType: mimeType,
    });
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    return { uploadUrl, storageKey };
  }

  async confirmUpload(
    userId: string,
    userEmail: string,
    orgId: string,
    _role: OrgRole,
    fileName: string,
    mimeType: string,
    fileSize: number,
    storageKey: string,
    targetId: string,
    targetType: 'task' | 'document',
  ) {
    // SECURITY: Validate storage key prefix to prevent cross-tenant attachment injection
    const expectedPrefix = `${orgId}/${targetType}/${targetId}/`;
    if (!storageKey.startsWith(expectedPrefix)) {
      throw new AppError(ERROR_CODES.FORBIDDEN, 'Invalid storage key', 403);
    }

    return withOrgContext(this.sql, { userId, userEmail, orgId }, async (tx) => {
      const [attachment] = await tx<{ id: string }[]>`
        INSERT INTO attachments (
          organization_id, task_id, document_id, uploaded_by_user_id,
          file_name, mime_type, file_size, storage_key
        )
        VALUES (
          ${orgId},
          ${targetType === 'task' ? targetId : null},
          ${targetType === 'document' ? targetId : null},
          ${userId}, ${fileName}, ${mimeType}, ${fileSize}, ${storageKey}
        )
        RETURNING id
      `;
      return attachment!;
    });
  }

  async listByTarget(
    userId: string,
    userEmail: string,
    orgId: string,
    role: OrgRole,
    targetId: string,
    targetType: 'task' | 'document',
  ) {
    if (!can(role, 'task', 'read')) {
      throw new AppError(ERROR_CODES.FORBIDDEN, 'Cannot read attachments', 403);
    }
    return withOrgContext(this.sql, { userId, userEmail, orgId }, async (tx) => {
      if (targetType === 'task') {
        return tx`
          SELECT id, file_name, mime_type, file_size, created_at
          FROM attachments WHERE organization_id = ${orgId} AND task_id = ${targetId}
        `;
      }
      return tx`
        SELECT id, file_name, mime_type, file_size, created_at
        FROM attachments WHERE organization_id = ${orgId} AND document_id = ${targetId}
      `;
    });
  }

  async getDownloadUrl(
    userId: string,
    userEmail: string,
    orgId: string,
    role: OrgRole,
    attachmentId: string,
  ) {
    if (!can(role, 'task', 'read')) {
      throw new AppError(ERROR_CODES.FORBIDDEN, 'Cannot download attachments', 403);
    }
    return withOrgContext(this.sql, { userId, userEmail, orgId }, async (tx) => {
      const [attachment] = await tx<{ storage_key: string }[]>`
        SELECT storage_key FROM attachments
        WHERE id = ${attachmentId} AND organization_id = ${orgId}
      `;
      if (!attachment) throw new AppError(ERROR_CODES.NOT_FOUND, 'Attachment not found', 404);

      const command = new GetObjectCommand({ Bucket: S3_BUCKET, Key: attachment.storage_key });
      const downloadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
      return { downloadUrl };
    });
  }
}
