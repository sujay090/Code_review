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
}
declare const githubService: GithubService;
export { githubService, GithubService };
//# sourceMappingURL=github.service.d.ts.map