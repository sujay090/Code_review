import express from "express";
import { handleGithubWebhook } from "../controllers/webhook.controller.js";
import { webhookLimiter } from "../middlewares/rateLimiter.js";

const router = express.Router();

// GitHub sends JSON but we need the raw body for signature verification.
// The express.raw() middleware is applied at the route level in index.ts,
// so req.body will be a Buffer here.
router.post("/github", webhookLimiter, handleGithubWebhook);

export default router;
