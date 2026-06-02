import { conn } from "../db/DB.js";
import type { Repository } from "../generated/prisma/client.js";
import { webhookService } from "./webhook.service.js";

export type ConnectRepositoryInput = {
  githubRepoId: string;
  name: string;
  fullName: string;
  defaultBranch: string | null;
};

class RepositoryService {
  async connectRepository(
    userId: string,
    accessToken: string,
    repository: ConnectRepositoryInput,
  ): Promise<Repository> {
    // Upsert the repository record
    const repo = await conn.repository.upsert({
      where: {
        githubRepoId: repository.githubRepoId,
      },
      update: {
        name: repository.name,
        fullName: repository.fullName,
        defaultBranch: repository.defaultBranch,
        userId,
        isActive: true,
      },
      create: {
        githubRepoId: repository.githubRepoId,
        name: repository.name,
        fullName: repository.fullName,
        defaultBranch: repository.defaultBranch,
        userId,
      },
    });

    // Register a GitHub webhook if one isn't already set up
    if (!repo.githubWebhookId) {
      try {
        const webhookId = await webhookService.registerWebhook(
          accessToken,
          repository.fullName,
        );

        return conn.repository.update({
          where: { id: repo.id },
          data: { githubWebhookId: webhookId },
        });
      } catch (error) {
        console.error(
          `Failed to register webhook for ${repository.fullName}:`,
          error,
        );
        // Return the repo even if webhook registration fails —
        // the user can retry or we can add a manual trigger later.
        return repo;
      }
    }

    return repo;
  }

  async getUserRepositories(userId: string): Promise<Repository[]> {
    return conn.repository.findMany({
      where: {
        userId,
        isActive: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });
  }
}

const repositoryService = new RepositoryService();

export { repositoryService, RepositoryService };

