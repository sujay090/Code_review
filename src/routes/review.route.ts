import express from "express";
import { getReviews, getReviewById, createManualReview } from "../controllers/review.controller.js";
import { validateRequest } from "../middlewares/validateUser.js";

const router = express.Router();

router.get("/", validateRequest, getReviews);
router.get("/:id", validateRequest, getReviewById);
router.post("/", validateRequest, createManualReview);

export default router;
