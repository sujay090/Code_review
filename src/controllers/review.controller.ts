import type { NextFunction, Request, Response } from "express";
import { reviewService } from "../services/review.service.js";
import { githubService } from "../services/github.service.js";
import { authService } from "../services/auth.service.js";
import { enqueueReview } from "../queues/review.queue.js";
import { conn } from "../db/DB.js";

/**
 * GET /api/reviews?repositoryId=xxx
 * Returns all reviews for a given repository.
 */
export const getReviews = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        if (!req.user) {
            res.status(401).json({ message: "Not authenticated" });
            return;
        }

        const repositoryId = req.query.repositoryId as string;

        // Verify the repository belongs to the current user
        const repository = await conn.repository.findUnique({
            where: { id: repositoryId },
        });

        if (!repository || repository.userId !== req.user.id) {
            res.status(404).json({ message: "Repository not found" });
            return;
        }

        const reviews = await reviewService.getReviewsByRepository(repositoryId);

        res.json({ reviews });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/reviews/:id
 * Returns a single review with all its issues.
 */
export const getReviewById = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        if (!req.user) {
            res.status(401).json({ message: "Not authenticated" });
            return;
        }

        const id = req.params.id as string;

        const review = await reviewService.getReviewById(id);

        if (!review) {
            res.status(404).json({ message: "Review not found" });
            return;
        }

        // Verify the review's repository belongs to the current user
        const repository = await conn.repository.findUnique({
            where: { id: review.repositoryId },
        });

        if (!repository || repository.userId !== req.user.id) {
            res.status(404).json({ message: "Review not found" });
            return;
        }

        res.json({ review });
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/reviews
 * Manually trigger a code review for the latest commit on a connected repo.
 *
 * Body: { repositoryId: string }
 */
export const createManualReview = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        if (!req.user) {
            res.status(401).json({ message: "Not authenticated" });
            return;
        }

        const { repositoryId } = req.body as { repositoryId: string };

        // Verify the repository belongs to the current user
        const repository = await conn.repository.findUnique({
            where: { id: repositoryId },
        });

        if (!repository || repository.userId !== req.user.id) {
            res.status(404).json({ message: "Repository not found" });
            return;
        }

        // Get the user's access token
        const user = await authService.getUserById(req.user.id);

        if (!user?.accessToken) {
            res
                .status(400)
                .json({ message: "Missing GitHub access token. Please re-login." });
            return;
        }

        // Fetch the latest commit on the default branch
        const branch = repository.defaultBranch ?? "main";
        const latestCommit = await githubService.getLatestCommit(
            user.accessToken,
            repository.fullName,
            branch,
        );

        // Check if we already have a review for this exact commit
        const existingReview = await conn.review.findFirst({
            where: {
                repositoryId,
                commitId: latestCommit.sha,
            },
        });

        if (existingReview) {
            res.status(409).json({
                message: `A review for this commit already exists (${latestCommit.sha.slice(0, 7)})`,
                reviewId: existingReview.id,
            });
            return;
        }

        // Create a PENDING review
        const review = await conn.review.create({
            data: {
                commitId: latestCommit.sha,
                branch,
                status: "PENDING",
                repositoryId,
            },
        });

        // Enqueue for background processing
        await enqueueReview(review.id);

        console.log(
            `Manual review created: ${review.id} for commit ${latestCommit.sha.slice(0, 7)} on ${repository.fullName}`,
        );

        res.status(202).json({
            message: "Review queued",
            reviewId: review.id,
            commitId: latestCommit.sha,
        });
    } catch (error) {
        next(error);
    }
};
