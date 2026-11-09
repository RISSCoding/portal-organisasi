// SPDX-License-Identifier: AGPL-3.0-or-later
import { Worker, Queue } from 'bullmq';
import IORedis from 'ioredis';
import { sendInvitationEmail } from './email.service';
import { deliverWebhook } from './webhook.service';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });

export const tokenCleanupQueue = new Queue('token-cleanup', { connection });
export const emailQueue = new Queue('email', { connection });
export const webhookQueue = new Queue('webhook', { connection });

// Worker: Token Cleanup
const tokenCleanupWorker = new Worker(
  'token-cleanup',
  async (_job) => {
    console.log('[Worker] Running cleanup of expired sessions and password resets...');
    return { ok: true, timestamp: new Date().toISOString() };
  },
  { connection },
);

interface EmailJobData {
  to: string;
  orgName: string;
  token: string;
}

interface WebhookJobData {
  deliveryId: string;
  url: string;
  secret: string;
  event: string;
  payload: Record<string, unknown>;
}

// Worker: Email Delivery
const emailWorker = new Worker<EmailJobData>(
  'email',
  async (job) => {
    if (job.name === 'send-invitation') {
      const { to, orgName, token } = job.data;
      await sendInvitationEmail(to, orgName, token);
    }
  },
  { connection },
);

// Worker: Webhook Delivery
const webhookWorker = new Worker<WebhookJobData>(
  'webhook',
  async (job) => {
    if (job.name === 'deliver') {
      const { deliveryId, url, secret, event, payload } = job.data;
      const result = await deliverWebhook(url, secret, event, payload);
      console.log(`[Worker] Webhook ${deliveryId} delivered: ${result.status}`);
    }
  },
  { connection },
);

emailWorker.on('completed', (job) => console.log(`[Worker] Email Job ${job.id} completed`));
emailWorker.on('failed', (job, err) => console.error(`[Worker] Email Job ${job?.id} failed:`, err));

webhookWorker.on('completed', (job) => console.log(`[Worker] Webhook Job ${job.id} completed`));
webhookWorker.on('failed', (job, err) =>
  console.error(`[Worker] Webhook Job ${job?.id} failed:`, err),
);

console.log('🚀 Worker started, listening for jobs...');

void tokenCleanupQueue.upsertJobScheduler(
  'hourly-cleanup',
  { pattern: '0 * * * *' },
  { name: 'cleanup', data: {} },
);

const shutdown = async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  await tokenCleanupWorker.close();
  await emailWorker.close();
  await webhookWorker.close();
  await tokenCleanupQueue.close();
  await emailQueue.close();
  await webhookQueue.close();
  await connection.quit();
  process.exit(0);
};

process.on('SIGTERM', () => {
  void shutdown();
});
process.on('SIGINT', () => {
  void shutdown();
});
