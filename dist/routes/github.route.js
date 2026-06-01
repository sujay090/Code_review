import express from "express";
import { getRepositories } from "../controllers/github.controller.js";
import { validateRequest } from "../middlewares/validateUser.js";
const router = express.Router();
router.get("/repos", validateRequest, getRepositories);
export default router;
//# sourceMappingURL=github.route.js.map