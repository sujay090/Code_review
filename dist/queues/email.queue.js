/**
 * Email Queue — BullMQ queue for sending notification emails.
 */
import { Queue } from "bullmq";
import { Redis } from "ioredis";
const redisUrl = process.env.REDIS_URL;
if (!redisUrl) {
    throw new Error("Missing environment variable: REDIS_URL");
}
const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
export const emailQueue = new Queue("email-notifications", {
    connection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: "exponential",
            delay: 10_000, // 10s, 20s, 40s between retries
        },
        removeOnComplete: { count: 200 },
        removeOnFail: { count: 50 },
    },
});
/**
 * Enqueue a review-completed notification email.
 */
export async function enqueueReviewEmail(reviewId) {
    await emailQueue.add("review-completed", { reviewId }, { jobId: `email-review-${reviewId}` });
    console.log(`Email notification enqueued for review ${reviewId}`);
}
//# sourceMappingURL=email.queue.js.map