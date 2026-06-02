/**
 * Report Queue — BullMQ queue for weekly digest report generation.
 */

import { Queue } from "bullmq";
import { Redis } from "ioredis";

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  throw new Error("Missing environment variable: REDIS_URL");
}

const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });

export const reportQueue = new Queue("report-generation", {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: "fixed",
      delay: 30_000, // 30s between retries
    },
    removeOnComplete: { count: 50 },
    removeOnFail: { count: 20 },
  },
});

/**
 * Enqueue a weekly digest for a specific user.
 */
export async function enqueueWeeklyDigest(userId: string): Promise<void> {
  await reportQueue.add(
    "weekly-digest",
    { userId },
    { jobId: `digest-${userId}-${Date.now()}` },
  );
}

/**
 * Enqueue weekly digests for ALL active users.
 * This is called by the report worker's repeatable schedule.
 */
export async function enqueueAllWeeklyDigests(): Promise<void> {
  // This will be called from the report worker's cron job
  await reportQueue.add(
    "trigger-all-digests",
    {},
    { jobId: `trigger-digests-${Date.now()}` },
  );

  console.log("Weekly digest trigger enqueued");
}
