/**
 * Review Queue — BullMQ-based job queue for processing code reviews.
 *
 * The webhook controller adds jobs to this queue.
 * The worker picks them up in a separate "thread" (BullMQ uses sandboxed
 * workers internally) and runs the review pipeline.
 */
import { Queue } from "bullmq";
export declare const reviewQueue: Queue<any, any, string, any, any, string>;
/**
 * Add a review job to the queue.
 */
export declare function enqueueReview(reviewId: string): Promise<void>;
//# sourceMappingURL=review.queue.d.ts.map