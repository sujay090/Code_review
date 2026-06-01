import express from "express";
import {
  connectRepository,
  getConnectedRepositories,
} from "../controllers/repository.controller.js";
import { validateRequest } from "../middlewares/validateUser.js";

const router = express.Router();

router.get("/", validateRequest, getConnectedRepositories);
router.post("/", validateRequest, connectRepository);

export default router;
