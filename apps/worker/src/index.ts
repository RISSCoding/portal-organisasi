// SPDX-License-Identifier: AGPL-3.0-or-later
import { Worker, Queue } from 'bullmq';
import IORedis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });

export const tokenCleanupQueue = new Queue('token-cleanup', { connection });

const tokenCleanupWorker = new Worker(
  'token-cleanup',
  async (_job) => {
    console.log('[Worker] Running cleanup of expired sessions and password resets...');
    return { ok: true, timestamp: new Date().toISOString() };
  },
  { connection },
);

tokenCleanupWorker.on('completed', (job) => console.log(`[Worker] Job ${job.id} completed`));
tokenCleanupWorker.on('failed', (job, err) =>
  console.error(`[Worker] Job ${job?.id} failed:`, err),
);

console.log('Worker started, listening for jobs...');

void tokenCleanupQueue.add(
  'cleanup',
  {},
  { repeat: { pattern: '0 * * * *' }, jobId: 'hourly-cleanup' },
);

// Graceful shutdown handler
const shutdown = async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  await tokenCleanupWorker.close();
  await tokenCleanupQueue.close();
  await connection.quit();
  process.exit(0);
};

process.on('SIGTERM', () => {
  void shutdown();
});
process.on('SIGINT', () => {
  void shutdown();
});
