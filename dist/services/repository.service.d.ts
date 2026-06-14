import type { Repository } from "../generated/prisma/client.js";
export type ConnectRepositoryInput = {
    githubRepoId: string;
    name: string;
    fullName: string;
    defaultBranch: string | null;
};
declare class RepositoryService {
    connectRepository(userId: string, accessToken: string, repository: ConnectRepositoryInput): Promise<Repository>;
    getUserRepositories(userId: string): Promise<Repository[]>;
}
declare const repositoryService: RepositoryService;
export { repositoryService, RepositoryService };
//# sourceMappingURL=repository.service.d.ts.map