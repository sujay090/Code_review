/**
 * Email Queue — BullMQ queue for sending notification emails.
 */
import { Queue } from "bullmq";
export declare const emailQueue: Queue<any, any, string, any, any, string>;
/**
 * Enqueue a review-completed notification email.
 */
export declare function enqueueReviewEmail(reviewId: string): Promise<void>;
//# sourceMappingURL=email.queue.d.ts.map