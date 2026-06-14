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
    /**
     * Fetch the raw diff text for a specific commit.
     */
    async getCommitDiff(accessToken, repoFullName, commitSha) {
        const response = await fetch(`https://api.github.com/repos/${repoFullName}/commits/${commitSha}`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: "application/vnd.github.diff",
                "X-GitHub-Api-Version": "2022-11-28",
            },
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch diff for ${commitSha} on ${repoFullName} (${response.status})`);
        }
        return response.text();
    }
    /**
     * Fetch the latest commit SHA on a branch (defaults to the repo's default branch).
     */
    async getLatestCommit(accessToken, repoFullName, branch) {
        const response = await fetch(`https://api.github.com/repos/${repoFullName}/commits/${branch}`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: "application/json",
                "X-GitHub-Api-Version": "2022-11-28",
            },
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch latest commit for ${repoFullName}/${branch} (${response.status})`);
        }
        const data = (await response.json());
        return { sha: data.sha, message: data.commit.message };
    }
}
const githubService = new GithubService();
export { githubService, GithubService };
//# sourceMappingURL=github.service.js.map