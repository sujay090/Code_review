import { repositoryService } from "../services/repository.service.js";
export const connectRepository = async (req, res, next) => {
    try {
        if (!req.user) {
            res.status(401).json({ message: "Not authenticated" });
            return;
        }
        const { githubRepoId, name, fullName, defaultBranch } = req.body;
        if (typeof githubRepoId !== "string" ||
            typeof name !== "string" ||
            typeof fullName !== "string" ||
            (defaultBranch !== null && typeof defaultBranch !== "string")) {
            res.status(400).json({ message: "Invalid repository payload" });
            return;
        }
        const repository = await repositoryService.connectRepository(req.user.id, {
            githubRepoId,
            name,
            fullName,
            defaultBranch,
        });
        res.status(201).json({
            repository: toRepositoryResponse(repository),
        });
    }
    catch (error) {
        next(error);
    }
};
export const getConnectedRepositories = async (req, res, next) => {
    try {
        if (!req.user) {
            res.status(401).json({ message: "Not authenticated" });
            return;
        }
        const repositories = await repositoryService.getUserRepositories(req.user.id);
        res.json({
            repositories: repositories.map(toRepositoryResponse),
        });
    }
    catch (error) {
        next(error);
    }
};
const toRepositoryResponse = (repository) => {
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
//# sourceMappingURL=repository.controller.js.map