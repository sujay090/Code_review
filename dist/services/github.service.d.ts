export type GithubRepository = {
    githubRepoId: string;
    name: string;
    fullName: string;
    private: boolean;
    owner: string;
    htmlUrl: string;
    defaultBranch: string;
    language: string | null;
    updatedAt: string;
};
declare class GithubService {
    getUserRepositories(accessToken: string, page: number, limit: number): Promise<GithubRepository[]>;
    /**
     * Fetch the raw diff text for a specific commit.
     */
    getCommitDiff(accessToken: string, repoFullName: string, commitSha: string): Promise<string>;
    /**
     * Fetch the latest commit SHA on a branch (defaults to the repo's default branch).
     */
    getLatestCommit(accessToken: string, repoFullName: string, branch: string): Promise<{
        sha: string;
        message: string;
    }>;
}
declare const githubService: GithubService;
export { githubService, GithubService };
//# sourceMappingURL=github.service.d.ts.map