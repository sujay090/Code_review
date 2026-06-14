import express from "express";
import { getReviews, getReviewById, createManualReview } from "../controllers/review.controller.js";
import { validateRequest } from "../middlewares/validateUser.js";
import { standardLimiter, writeLimiter } from "../middlewares/rateLimiter.js";

const router = express.Router();

router.get("/", validateRequest, standardLimiter, getReviews);
router.get("/:id", validateRequest, standardLimiter, getReviewById);
router.post("/", validateRequest, writeLimiter, createManualReview);

export default router;
