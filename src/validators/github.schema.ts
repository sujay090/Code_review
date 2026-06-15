import { z } from "zod";

/**
 * GET /api/github/repos?page=1&limit=10
 * Query params for listing the user's GitHub repos.
 * Values arrive as strings from the query string and are coerced to numbers.
 */
export const getReposQuerySchema = z.object({
  page: z.coerce
    .number()
    .int("page must be an integer")
    .positive("page must be positive")
    .default(1),
  limit: z.coerce
    .number()
    .int("limit must be an integer")
    .positive("limit must be positive")
    .max(30, "limit cannot exceed 30")
    .default(10),
});
