import express from "express";
import {
  getMe,
  githubCallback,
  loginWithGithub,
  logout,
} from "../controllers/auth.controller.js";
import { validateRequest } from "../middlewares/validateUser.js";
import { authLimiter } from "../middlewares/rateLimiter.js";
import { validate } from "../middlewares/validate.js";
import { githubCallbackQuerySchema } from "../validators/auth.schema.js";

const router = express.Router();

router.get("/github", authLimiter, loginWithGithub);
router.get(
  "/github/callback",
  authLimiter,
  validate({ query: githubCallbackQuerySchema }),
  githubCallback,
);
router.get("/me", validateRequest, getMe);
router.post("/logout", validateRequest, logout);

export default router;
