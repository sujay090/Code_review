/**
 * Report Worker — Generates weekly digest emails for all users.
 *
 * Handles two job types:
 * 1. "trigger-all-digests" — Finds all users with repos and enqueues individual digests
 * 2. "weekly-digest"       — Generates and sends one user's weekly summary
 *
 * A repeatable cron job runs every Monday at 9:00 AM to trigger digests.
 */
import { Worker } from "bullmq";
declare const reportWorker: Worker<any, any, string>;
export { reportWorker };
//# sourceMappingURL=report.worker.d.ts.map