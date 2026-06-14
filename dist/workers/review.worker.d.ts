/**
 * Review Worker — BullMQ worker that processes review jobs in the background.
 *
 * This runs in a separate "thread" managed by BullMQ.
 * Each job receives a reviewId and runs the full AI review pipeline.
 */
import { Worker } from "bullmq";
declare const worker: Worker<any, any, string>;
export { worker };
//# sourceMappingURL=review.worker.d.ts.map