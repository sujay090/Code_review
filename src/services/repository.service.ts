import { conn } from "../db/DB.js";
import type { Repository } from "../generated/prisma/client.js";

export type ConnectRepositoryInput = {
  githubRepoId: string;
  name: string;
  fullName: string;
  defaultBranch: string | null;
};

class RepositoryService {
  async connectRepository(
    userId: string,
    repository: ConnectRepositoryInput,
  ): Promise<Repository> {
    return conn.repository.upsert({
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
