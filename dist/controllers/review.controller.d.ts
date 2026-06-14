import type { NextFunction, Request, Response } from "express";
/**
 * GET /api/reviews?repositoryId=xxx
 * Returns all reviews for a given repository.
 */
export declare const getReviews: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * GET /api/reviews/:id
 * Returns a single review with all its issues.
 */
export declare const getReviewById: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * POST /api/reviews
 * Manually trigger a code review for the latest commit on a connected repo.
 *
 * Body: { repositoryId: string }
 */
export declare const createManualReview: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=review.controller.d.ts.map