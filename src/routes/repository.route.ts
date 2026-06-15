import express from "express";
import {
  connectRepository,
  getConnectedRepositories,
} from "../controllers/repository.controller.js";
import { validateRequest } from "../middlewares/validateUser.js";
import { standardLimiter, writeLimiter } from "../middlewares/rateLimiter.js";
import { validate } from "../middlewares/validate.js";
import { connectRepositoryBodySchema } from "../validators/repository.schema.js";

const router = express.Router();

router.get("/", validateRequest, standardLimiter, getConnectedRepositories);
router.post(
  "/",
  validateRequest,
  writeLimiter,
  validate({ body: connectRepositoryBodySchema }),
  connectRepository,
);

export default router;
