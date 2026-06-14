import express from "express";
import {
  connectRepository,
  getConnectedRepositories,
} from "../controllers/repository.controller.js";
import { validateRequest } from "../middlewares/validateUser.js";
import { standardLimiter, writeLimiter } from "../middlewares/rateLimiter.js";

const router = express.Router();

router.get("/", validateRequest, standardLimiter, getConnectedRepositories);
router.post("/", validateRequest, writeLimiter, connectRepository);

export default router;
