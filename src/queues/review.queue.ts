/**
 * Review Queue — BullMQ-based job queue for processing code reviews.
 *
 * The webhook controller adds jobs to this queue.
 * The worker picks them up in a separate "thread" (BullMQ uses sandboxed
 * workers internally) and runs the review pipeline.
 */

import { Queue } from "bullmq";
import { Redis } from "ioredis";

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  throw new Error("Missing environment variable: REDIS_URL");
}

const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });

export const reviewQueue = new Queue("review-processing", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5_000, // 5s, 10s, 20s between retries
    },
    removeOnComplete: { count: 100 },  // keep last 100 completed jobs
    removeOnFail: { count: 50 },       // keep last 50 failed jobs
  },
});

/**
 * Add a review job to the queue.
 */
export async function enqueueReview(reviewId: string): Promise<void> {
  await reviewQueue.add(
    "process-review",
    { reviewId },
    { jobId: `review-${reviewId}` }, // deduplicate by reviewId
  );

  console.log(`Review ${reviewId} enqueued for background processing`);
}
