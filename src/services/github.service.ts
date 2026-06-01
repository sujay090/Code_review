type GithubApiRepository = {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  owner: {
    login: string;
  };
  html_url: string;
  default_branch: string;
  language: string | null;
  updated_at: string;
};

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

class GithubService {
  async getUserRepositories(
    accessToken: string,
    page: number,
    limit: number,
  ): Promise<GithubRepository[]> {
    if (!accessToken) throw new Error("accessToken is missing ");

    try {
      const response = await fetch(
        `https://api.github.com/user/repos?sort=updated&direction=desc&page=${page}&per_page=${limit}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error("GitHub repositories request failed");
      }

      const repos = (await response.json()) as GithubApiRepository[];

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
    } catch (err) {
      throw new Error("Error fetching user repositories", { cause: err });
    }
  }
    
}

const githubService = new GithubService();

export { githubService, GithubService };
