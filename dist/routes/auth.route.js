import express from "express";
import { getMe, githubCallback, loginWithGithub, logout, } from "../controllers/auth.controller.js";
import { validateRequest } from "../middlewares/validateUser.js";
const router = express.Router();
router.get("/github", loginWithGithub);
router.get("/github/callback", githubCallback);
router.get("/me", validateRequest, getMe);
router.post("/logout", logout);
export default router;
//# sourceMappingURL=auth.route.js.map