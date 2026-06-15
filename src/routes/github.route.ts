import express from "express";
import { getRepositories } from "../controllers/github.controller.js";
import { validateRequest } from "../middlewares/validateUser.js";
import { standardLimiter } from "../middlewares/rateLimiter.js";
import { validate } from "../middlewares/validate.js";
import { getReposQuerySchema } from "../validators/github.schema.js";

const router = express.Router();

router.get(
  "/repos",
  validateRequest,
  standardLimiter,
  validate({ query: getReposQuerySchema }),
  getRepositories,
);

export default router;
