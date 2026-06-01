class GithubService {
    async getUserRepositories(accessToken, page, limit) {
        if (!accessToken)
            throw new Error("accessToken is missing ");
        try {
            const response = await fetch(`https://api.github.com/user/repos?sort=updated&direction=desc&page=${page}&per_page=${limit}`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    Accept: "application/json",
                },
            });
            if (!response.ok) {
                throw new Error("GitHub repositories request failed");
            }
            const repos = (await response.json());
            return repos.map((repo) => ({
                githubRepoId: String(repo.id),
                name: repo.name,
                fullName: repo.full_name,
                private: repo.private,
                owner: repo.owner.login,
                htmlUrl: repo.html_url,
                defaultBranch: repo.default_branch,
                language: repo.language,
                updatedAt: repo.updated_at,
            }));
        }
        catch (err) {
            throw new Error("Error fetching user repositories", { cause: err });
        }
    }
}
const githubService = new GithubService();
export { githubService, GithubService };
//# sourceMappingURL=github.service.js.map