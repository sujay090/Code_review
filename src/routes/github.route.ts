import express from "express";
import { getRepositories } from "../controllers/github.controller.js";
import { validateRequest } from "../middlewares/validateUser.js";
import { standardLimiter } from "../middlewares/rateLimiter.js";

const router = express.Router();

router.get("/repos", validateRequest, standardLimiter, getRepositories);

export default router;
