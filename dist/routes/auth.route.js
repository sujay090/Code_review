import express from "express";
import { getMe, githubCallback, loginWithGithub, logout, } from "../controllers/auth.controller.js";
import { validateRequest } from "../middlewares/validateUser.js";
import { authLimiter } from "../middlewares/rateLimiter.js";
const router = express.Router();
router.get("/github", authLimiter, loginWithGithub);
router.get("/github/callback", authLimiter, githubCallback);
router.get("/me", validateRequest, getMe);
router.post("/logout", validateRequest, logout);
export default router;
//# sourceMappingURL=auth.route.js.map