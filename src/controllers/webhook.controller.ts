import type { Request, Response, NextFunction } from "express";
import { webhookService } from "../services/webhook.service.js";
import { enqueueReview } from "../queues/review.queue.js";
import { conn } from "../db/DB.js";

/**
 * GitHub webhook push-event payload (only the fields we need).
 */
type PushEventPayload = {
    ref: string;
    after: string;
    repository: {
        id: number;
        full_name: string;
    };
    head_commit: {
        id: string;
        message: string;
        author: {
            name: string;
            username: string;
        };
    } | null;
};

/**
 * Handle incoming GitHub webhook events.
 *
 * - Verifies HMAC-SHA256 signature
 * - Responds to `ping` events (webhook registration confirmation)
 * - Creates a Review record for `push` events
 */
export const handleGithubWebhook = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const signatureHeader = req.headers["x-hub-signature-256"];
        const event = req.headers["x-github-event"];

        if (!signatureHeader || typeof signatureHeader !== "string") {
            res.status(401).json({ message: "Missing signature header" });
            return;
        }

        if (!event || typeof event !== "string") {
            res.status(400).json({ message: "Missing event header" });
            return;
        }

        /* ── Verify signature ─────────────────────────────────────── */
        const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;

        if (!webhookSecret) {
            console.error("GITHUB_WEBHOOK_SECRET is not set");
            res.status(500).json({ message: "Server misconfigured" });
            return;
        }

        // req.body is a raw Buffer because of express.raw() middleware on this route
        const rawBody: Buffer = req.body;
        const isValid = webhookService.verifySignature(
            rawBody,
            signatureHeader,
            webhookSecret,
        );

        if (!isValid) {
            console.warn("Webhook signature verification failed");
            res.status(401).json({ message: "Invalid signature" });
            return;
        }

        /* ── Handle ping ──────────────────────────────────────────── */
        if (event === "ping") {
            console.log("GitHub webhook ping received ✓");
            res.status(200).json({ message: "pong" });
            return;
        }

        /* ── Handle push ──────────────────────────────────────────── */
        if (event === "push") {
            const payload = JSON.parse(rawBody.toString()) as PushEventPayload;

            const githubRepoId = String(payload.repository.id);
            const commitId = payload.after;
            const branch = payload.ref.replace("refs/heads/", "");

            // Skip if this is a branch deletion (all-zero commit SHA)
            if (commitId === "0000000000000000000000000000000000000000") {
                res.status(200).json({ message: "Branch deletion ignored" });
                return;
            }

            // Find the connected repository in our database
            const repository = await conn.repository.findUnique({
                where: { githubRepoId },
            });

            if (!repository) {
                console.warn(
                    `Webhook received for untracked repo: ${payload.repository.full_name} (${githubRepoId})`,
                );
                res.status(200).json({ message: "Repository not connected" });
                return;
            }

            if (!repository.isActive) {
                res.status(200).json({ message: "Repository is inactive" });
                return;
            }

            // Create a Review record with PENDING status
            const review = await conn.review.create({
                data: {
                    commitId,
                    branch,
                    status: "PENDING",
                    repositoryId: repository.id,
                },
            });

            console.log(
                `Review created: ${review.id} for commit ${commitId.slice(0, 7)} on ${payload.repository.full_name}/${branch}`,
            );

            // Enqueue the review for background processing via BullMQ.
            // The worker picks this up in a separate thread.
            await enqueueReview(review.id);

            res.status(202).json({
                message: "Review queued",
                reviewId: review.id,
            });
            return;
        }

        /* ── Unsupported event ────────────────────────────────────── */
        res.status(200).json({ message: `Event '${event}' ignored` });
    } catch (error) {
        next(error);
    }
};
