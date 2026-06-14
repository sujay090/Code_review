import type { Request, Response, NextFunction } from "express";
/**
 * Handle incoming GitHub webhook events.
 *
 * - Verifies HMAC-SHA256 signature
 * - Responds to `ping` events (webhook registration confirmation)
 * - Creates a Review record for `push` events
 */
export declare const handleGithubWebhook: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=webhook.controller.d.ts.map