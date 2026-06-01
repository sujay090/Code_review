import { conn } from "../db/DB.js";
class RepositoryService {
    async connectRepository(userId, repository) {
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
    async getUserRepositories(userId) {
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
//# sourceMappingURL=repository.service.js.map