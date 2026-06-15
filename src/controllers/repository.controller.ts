import type { NextFunction, Request, Response } from "express";
import { repositoryService } from "../services/repository.service.js";
import { authService } from "../services/auth.service.js";

export const connectRepository = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }

    const { githubRepoId, name, fullName, defaultBranch } = req.body;

    // Fetch the full user to get the access token for webhook registration
    const user = await authService.getUserById(req.user.id);

    if (!user?.accessToken) {
      res.status(401).json({ message: "GitHub account is not connected" });
      return;
    }

    const repository = await repositoryService.connectRepository(
      req.user.id,
      user.accessToken,
      {
        githubRepoId,
        name,
        fullName,
        defaultBranch,
      },
    );

    res.status(201).json({
      repository: toRepositoryResponse(repository),
    });
  } catch (error) {
    next(error);
  }
};

export const getConnectedRepositories = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }

    const repositories = await repositoryService.getUserRepositories(
      req.user.id,
    );

    res.json({
      repositories: repositories.map(toRepositoryResponse),
    });
  } catch (error) {
    next(error);
  }
};

const toRepositoryResponse = (
  repository: Awaited<ReturnType<typeof repositoryService.connectRepository>>,
) => {
  return {
    id: repository.id,
    githubRepoId: repository.githubRepoId,
    name: repository.name,
    fullName: repository.fullName,
    defaultBranch: repository.defaultBranch,
    isActive: repository.isActive,
    createdAt: repository.createdAt,
    updatedAt: repository.updatedAt,
  };
};
