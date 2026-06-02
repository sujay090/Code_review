import { conn } from "../db/DB.js";
import { githubService } from "./github.service.js";
import { aiService } from "./ai.service.js";
import { authService } from "./auth.service.js";
import { enqueueReviewEmail } from "../queues/email.queue.js";
import type { Review, Issue } from "../generated/prisma/client.js";

type ReviewWithIssues = Review & { issues: Issue[] };

class ReviewService {
  /**
   * The main review pipeline.
   *
   * 1. Fetch the review + repository from DB
   * 2. Get the user's access token
   * 3. Fetch the commit diff from GitHub
   * 4. Send the diff to Gemini AI for analysis
   * 5. Store the issues and update the review
   */
  async processReview(reviewId: string): Promise<void> {
    try {
      // 1. Fetch the review with its repository
      const review = await conn.review.findUnique({
        where: { id: reviewId },
        include: { repository: true },
      });

      if (!review) {
        console.error(`Review ${reviewId} not found`);
        return;
      }

      if (review.status !== "PENDING") {
        console.log(
          `Review ${reviewId} is already ${review.status}, skipping`,
        );
        return;
      }

      // 2. Update status to PROCESSING
      await conn.review.update({
        where: { id: reviewId },
        data: {
          status: "PROCESSING",
          startedAt: new Date(),
        },
      });

      console.log(`Processing review ${reviewId} for commit ${review.commitId.slice(0, 7)}...`);

      // 3. Get the user's access token
      const user = await authService.getUserById(review.repository.userId);

      if (!user?.accessToken) {
        throw new Error(
          `User ${review.repository.userId} has no access token`,
        );
      }

      // 4. Fetch the commit diff from GitHub
      const diff = await githubService.getCommitDiff(
        user.accessToken,
        review.repository.fullName,
        review.commitId,
      );

      if (!diff || diff.trim().length === 0) {
        // No diff content (empty commit), mark as completed with perfect score
        await conn.review.update({
          where: { id: reviewId },
          data: {
            status: "COMPLETED",
            aiSummary: "Empty commit — no code changes to review.",
            score: 100,
            completedAt: new Date(),
          },
        });
        return;
      }

      // 5. Send to Gemini AI for analysis
      const aiResult = await aiService.reviewCode(
        diff,
        review.repository.fullName,
      );

      // 6. Store the issues
      if (aiResult.issues.length > 0) {
        await conn.issue.createMany({
          data: aiResult.issues.map((issue) => ({
            type: issue.type,
            severity: issue.severity,
            title: issue.title,
            description: issue.description,
            filePath: issue.filePath ?? null,
            lineNumber: issue.lineNumber ?? null,
            reviewId,
          })),
        });
      }

      // 7. Update the review with AI results
      await conn.review.update({
        where: { id: reviewId },
        data: {
          status: "COMPLETED",
          aiSummary: aiResult.summary,
          score: aiResult.score,
          completedAt: new Date(),
        },
      });

      console.log(
        `Review ${reviewId} completed: score=${aiResult.score}, issues=${aiResult.issues.length}`,
      );

      // 8. Enqueue email notification
      await enqueueReviewEmail(reviewId);
    } catch (error) {
      console.error(`Review ${reviewId} failed:`, error);

      // Mark as FAILED so we know something went wrong
      await conn.review
        .update({
          where: { id: reviewId },
          data: { status: "FAILED" },
        })
        .catch(() => {
          // If even the update fails, just log it
        });
    }
  }

  /**
   * Get all reviews for a repository, ordered by newest first.
   */
  async getReviewsByRepository(repositoryId: string): Promise<Review[]> {
    return conn.review.findMany({
      where: { repositoryId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { issues: true },
        },
      },
    });
  }

  /**
   * Get a single review by ID, including all its issues.
   */
  async getReviewById(reviewId: string): Promise<ReviewWithIssues | null> {
    return conn.review.findUnique({
      where: { id: reviewId },
      include: {
        issues: {
          orderBy: [{ severity: "desc" }, { type: "asc" }],
        },
        repository: {
          select: {
            fullName: true,
            name: true,
          },
        },
      },
    });
  }
}

const reviewService = new ReviewService();

export { reviewService, ReviewService };
