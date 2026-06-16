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
import { Redis } from "ioredis";
import { conn } from "../db/DB.js";
import { emailService } from "../services/email.service.js";
import { reportQueue } from "../queues/report.queue.js";

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
    throw new Error("Missing environment variable: REDIS_URL");
}

const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
const frontendUrl = process.env.CORS_ORIGIN ?? "http://localhost:5173";

const reportWorker = new Worker(
    "report-generation",
    async (job) => {
        /* ── Trigger all digests ───────────────────────────────── */
        if (job.name === "trigger-all-digests") {
            console.log("[ReportWorker] Triggering weekly digests for all users...");

            // Find all users who have at least one active repository
            const users = await conn.user.findMany({
                where: {
                    repositories: {
                        some: { isActive: true },
                    },
                },
                select: { id: true, username: true },
            });

            console.log(
                `[ReportWorker] Found ${users.length} users with active repos`,
            );

            // Enqueue individual digest jobs
            for (const user of users) {
                await reportQueue.add(
                    "weekly-digest",
                    { userId: user.id },
                    { jobId: `digest-${user.id}-${Date.now()}` },
                );
            }

            return;
        }

        /* ── Individual weekly digest ──────────────────────────── */
        if (job.name === "weekly-digest") {
            const { userId } = job.data as { userId: string };

            console.log(
                `[ReportWorker] Generating weekly digest for user ${userId}`,
            );

            const user = await conn.user.findUnique({
                where: { id: userId },
            });

            if (!user || !user.email) {
                console.warn(
                    `[ReportWorker] User ${userId} not found or has no email`,
                );
                return;
            }

            // Get reviews from the last 7 days
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

            const reviews = await conn.review.findMany({
                where: {
                    repository: { userId },
                    status: "COMPLETED",
                    completedAt: { gte: oneWeekAgo },
                },
                include: {
                    repository: { select: { name: true, fullName: true } },
                    _count: { select: { issues: true } },
                },
            });

            if (reviews.length === 0) {
                console.log(
                    `[ReportWorker] No reviews for user ${userId} this week, skipping`,
                );
                return;
            }

            // Calculate stats
            const totalReviews = reviews.length;
            const totalScore = reviews.reduce(
                (sum: any, r: any) => sum + (r.score ?? 0),
                0,
            );
            const avgScore = Math.round(totalScore / totalReviews);
            const totalIssues = reviews.reduce(
                (sum: any, r: any) => sum + r._count.issues,
                0,
            );

            // Group by repository
            const repoMap = new Map<
                string,
                { name: string; reviews: number; totalScore: number }
            >();
            for (const review of reviews) {
                const key = review.repository.fullName;
                const entry = repoMap.get(key) ?? {
                    name: review.repository.name,
                    reviews: 0,
                    totalScore: 0,
                };
                entry.reviews++;
                entry.totalScore += review.score ?? 0;
                repoMap.set(key, entry);
            }

            const repos = Array.from(repoMap.values()).map((r) => ({
                name: r.name,
                reviews: r.reviews,
                avgScore: Math.round(r.totalScore / r.reviews),
            }));

            // Format dates
            const weekEnd = new Date();
            const weekStart = oneWeekAgo;
            const fmt = (d: Date) =>
                d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

            // Send the digest email
            await emailService.sendWeeklyDigest({
                to: user.email,
                username: user.username,
                weekStart: fmt(weekStart),
                weekEnd: fmt(weekEnd),
                totalReviews,
                avgScore,
                totalIssues,
                repos,
                dashboardUrl: `${frontendUrl}/dashboard`,
            });

            console.log(
                `[ReportWorker] Weekly digest sent to ${user.email} — ${totalReviews} reviews, avg ${avgScore}`,
            );
        }
    },
    {
        connection,
        concurrency: 2,
    },
);

/* ── Schedule the weekly cron job ─────────────────────────────── */
// Runs every Monday at 9:00 AM
reportQueue
    .add(
        "trigger-all-digests",
        {},
        {
            repeat: {
                pattern: "0 9 * * 1", // Monday at 9:00 AM
            },
            jobId: "weekly-digest-cron",
        },
    )
    .then(() => {
        console.log(
            "[ReportWorker] Weekly digest cron scheduled (Monday 9:00 AM)",
        );
    })
    .catch((err) => {
        console.error("[ReportWorker] Failed to schedule cron:", err.message);
    });

reportWorker.on("completed", (job) => {
    console.log(`[ReportWorker] Job ${job.id} (${job.name}) completed`);
});

reportWorker.on("failed", (job, err) => {
    console.error(
        `[ReportWorker] Job ${job?.id} (${job?.name}) failed:`,
        err.message,
    );
});

export { reportWorker };
