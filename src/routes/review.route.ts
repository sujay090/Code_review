import express from "express";
import { getReviews, getReviewById, createManualReview } from "../controllers/review.controller.js";
import { validateRequest } from "../middlewares/validateUser.js";
import { standardLimiter, writeLimiter } from "../middlewares/rateLimiter.js";
import { validate } from "../middlewares/validate.js";
import {
  getReviewsQuerySchema,
  getReviewParamsSchema,
  createReviewBodySchema,
} from "../validators/review.schema.js";

const router = express.Router();

router.get(
  "/",
  validateRequest,
  standardLimiter,
  validate({ query: getReviewsQuerySchema }),
  getReviews,
);
router.get(
  "/:id",
  validateRequest,
  standardLimiter,
  validate({ params: getReviewParamsSchema }),
  getReviewById,
);
router.post(
  "/",
  validateRequest,
  writeLimiter,
  validate({ body: createReviewBodySchema }),
  createManualReview,
);

export default router;
