/**
 * Email Worker — Sends notification emails when reviews complete.
 */

import { Worker } from "bullmq";
import { Redis } from "ioredis";
import { conn } from "../db/DB.js";
import { emailService } from "../services/email.service.js";

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  throw new Error("Missing environment variable: REDIS_URL");
}

const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
const frontendUrl = process.env.CORS_ORIGIN ?? "http://localhost:5173";

const emailWorker = new Worker(
  "email-notifications",
  async (job) => {
    const { reviewId } = job.data as { reviewId: string };

    console.log(
      `[EmailWorker] Sending notification for review ${reviewId} (attempt ${job.attemptsMade + 1})`,
    );

    // Fetch the review with its repository and user
    const review = await conn.review.findUnique({
      where: { id: reviewId },
      include: {
        repository: {
          include: {
            user: true,
          },
        },
        _count: { select: { issues: true } },
      },
    });

    if (!review) {
      console.warn(`[EmailWorker] Review ${reviewId} not found, skipping`);
      return;
    }

    if (review.status !== "COMPLETED") {
      console.warn(
        `[EmailWorker] Review ${reviewId} is ${review.status}, skipping email`,
      );
      return;
    }

    const user = review.repository.user;

    if (!user.email) {
      console.warn(
        `[EmailWorker] User ${user.id} has no email, skipping`,
      );
      return;
    }

    // Send the notification email
    const result = await emailService.sendReviewNotification({
      to: user.email,
      username: user.username,
      repoFullName: review.repository.fullName,
      commitId: review.commitId,
      score: review.score ?? 0,
      issueCount: review._count.issues,
      summary: review.aiSummary ?? "Review completed.",
      reviewUrl: `${frontendUrl}/reviews/${review.id}`,
    });

    // Record the notification in the database
    await conn.notification.create({
      data: {
        type: "EMAIL",
        status: "SENT",
        userId: user.id,
      },
    });

    console.log(
      `[EmailWorker] Email sent for review ${reviewId} → ${user.email} (${result})`,
    );
  },
  {
    connection,
    concurrency: 5,
  },
);

emailWorker.on("completed", (job) => {
  console.log(`[EmailWorker] Job ${job.id} completed`);
});

emailWorker.on("failed", (job, err) => {
  console.error(
    `[EmailWorker] Job ${job?.id} failed:`,
    err.message,
  );
});

export { emailWorker };
