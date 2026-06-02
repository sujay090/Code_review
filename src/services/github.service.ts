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

  /**
   * Fetch the raw diff text for a specific commit.
   */
  async getCommitDiff(
    accessToken: string,
    repoFullName: string,
    commitSha: string,
  ): Promise<string> {
    const response = await fetch(
      `https://api.github.com/repos/${repoFullName}/commits/${commitSha}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github.diff",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      },
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch diff for ${commitSha} on ${repoFullName} (${response.status})`,
      );
    }

    return response.text();
  }

  /**
   * Fetch the latest commit SHA on a branch (defaults to the repo's default branch).
   */
  async getLatestCommit(
    accessToken: string,
    repoFullName: string,
    branch: string,
  ): Promise<{ sha: string; message: string }> {
    const response = await fetch(
      `https://api.github.com/repos/${repoFullName}/commits/${branch}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      },
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch latest commit for ${repoFullName}/${branch} (${response.status})`,
      );
    }

    const data = (await response.json()) as {
      sha: string;
      commit: { message: string };
    };

    return { sha: data.sha, message: data.commit.message };
  }
}

const githubService = new GithubService();

export { githubService, GithubService };
