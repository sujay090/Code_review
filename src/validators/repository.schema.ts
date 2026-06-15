import { z } from "zod";

/**
 * POST /api/repositories
 * Body for connecting a GitHub repository.
 */
export const connectRepositoryBodySchema = z.object({
  githubRepoId: z
    .string({ error: "githubRepoId is required" })
    .min(1, "githubRepoId must not be empty"),
  name: z
    .string({ error: "name is required" })
    .min(1, "name must not be empty"),
  fullName: z
    .string({ error: "fullName is required" })
    .min(1, "fullName must not be empty")
    .regex(/^[^/]+\/[^/]+$/, "fullName must be in owner/repo format"),
  defaultBranch: z
    .string()
    .min(1, "defaultBranch must not be empty")
    .nullable()
    .optional()
    .default(null),
});
