import { z } from "zod";

/**
 * GET /api/reviews?repositoryId=xxx
 * Query params for listing reviews.
 */
export const getReviewsQuerySchema = z.object({
  repositoryId: z
    .string({ error: "repositoryId query parameter is required" })
    .min(1, "repositoryId must not be empty"),
});

/**
 * GET /api/reviews/:id
 * Path params for fetching a single review.
 */
export const getReviewParamsSchema = z.object({
  id: z
    .string({ error: "Review ID is required" })
    .min(1, "Review ID must not be empty"),
});

/**
 * POST /api/reviews
 * Body for manually triggering a code review.
 */
export const createReviewBodySchema = z.object({
  repositoryId: z
    .string({ error: "repositoryId is required" })
    .min(1, "repositoryId must not be empty"),
});
