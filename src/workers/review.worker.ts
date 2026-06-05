/**
 * Review Worker — BullMQ worker that processes review jobs in the background.
 *
 * This runs in a separate "thread" managed by BullMQ.
 * Each job receives a reviewId and runs the full AI review pipeline.
 */

import { Worker } from "bullmq";
import { Redis } from "ioredis";
import { reviewService } from "../services/review.service.js";

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
    throw new Error("Missing environment variable: REDIS_URL");
}

const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });

const worker = new Worker(
    "review-processing", // must match the queue name
    async (job) => {
        const { reviewId } = job.data as { reviewId: string };

        console.log(
            `[Worker] Processing review ${reviewId} (job ${job.id}, attempt ${job.attemptsMade + 1})`,
        );

        await reviewService.processReview(reviewId);

        console.log(`[Worker] Review ${reviewId} completed successfully`);
    },
    {
        connection,
        concurrency: 3, // process up to 3 reviews in parallel
    },
);

/* ── Event listeners for observability ───────────────────────── */

worker.on("completed", (job) => {
    console.log(`[Worker] Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
    console.error(
        `[Worker] Job ${job?.id} failed (attempt ${job?.attemptsMade}/${job?.opts?.attempts}):`,
        err.message,
    );
});

worker.on("error", (err) => {
    console.error("[Worker] Worker error:", err.message);
});

export { worker };
