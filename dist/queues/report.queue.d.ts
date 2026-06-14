/**
 * Report Queue — BullMQ queue for weekly digest report generation.
 */
import { Queue } from "bullmq";
export declare const reportQueue: Queue<any, any, string, any, any, string>;
/**
 * Enqueue a weekly digest for a specific user.
 */
export declare function enqueueWeeklyDigest(userId: string): Promise<void>;
/**
 * Enqueue weekly digests for ALL active users.
 * This is called by the report worker's repeatable schedule.
 */
export declare function enqueueAllWeeklyDigests(): Promise<void>;
//# sourceMappingURL=report.queue.d.ts.map