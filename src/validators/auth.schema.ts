import { z } from "zod";

/**
 * GET /api/auth/github/callback
 * Query params delivered by GitHub's OAuth redirect.
 */
export const githubCallbackQuerySchema = z.object({
  code: z.string({ error: "Missing GitHub OAuth code" }).min(1),
  state: z.string({ error: "Missing OAuth state" }).min(1),
});
