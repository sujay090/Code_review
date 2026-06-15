import type { NextFunction, Request, Response } from "express";
import { authService } from "../services/auth.service.js";
import { githubService } from "../services/github.service.js";

export const getRepositories = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }

    // Values are already validated, coerced, and defaulted by Zod middleware
    const { page, limit } = req.query as unknown as {
      page: number;
      limit: number;
    };
    const user = await authService.getUserById(req.user.id);

    if (!user?.accessToken) {
      res.status(401).json({ message: "GitHub account is not connected" });
      return;
    }

    const repositories = await githubService.getUserRepositories(
      user.accessToken,
      page,
      limit,
    );

    res.json({
      page,
      limit,
      repositories,
    });
  } catch (error) {
    next(error);
  }
};

