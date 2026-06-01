import { randomBytes } from "node:crypto";
import { conn } from "../db/DB.js";
import type { User } from "../generated/prisma/client.js";
import { rd } from "../db/redis.js";

export type GithubUser = {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string;
  email: string | null;
};

type GithubEmail = {
  email: string;
  primary: boolean;
  verified: boolean;
};

type GithubAccessTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  error?: string;
  error_description?: string;
};

interface IAuthService {
  createGithubState(): string;
  getGithubAuthUrl(state: string): string;
  exchangeCodeForToken(code: string): Promise<string>;
  getGithubUser(accessToken: string): Promise<GithubUser>;
  findOrCreateUser(githubUser: GithubUser, accessToken: string): Promise<User>;
  createSession(userId: string): Promise<string>;
  getCurrentUser(sessionId: string): Promise<User | null>;
  getUserById(userId: string): Promise<User | null>;
  logout(sessionId: string): Promise<void>;
}

class AuthService implements IAuthService {
  createGithubState(): string {
    return randomBytes(32).toString("hex");
  }

  getGithubAuthUrl(state: string): string {
    const url = new URL("https://github.com/login/oauth/authorize");

    url.searchParams.set("client_id", this.getRequiredEnv("GITHUB_CLIENT_ID"));
    url.searchParams.set(
      "redirect_uri",
      this.getRequiredEnv("GITHUB_CALLBACK_URL"),
    );
    url.searchParams.set("scope", "read:user user:email");
    url.searchParams.set("state", state);
    return url.toString();
  }

  async exchangeCodeForToken(code: string): Promise<string> {
    try {
      const response = await fetch(
        "https://github.com/login/oauth/access_token",
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            client_id: this.getRequiredEnv("GITHUB_CLIENT_ID"),
            client_secret: this.getRequiredEnv("GITHUB_CLIENT_SECRET"),
            code,
            redirect_uri: this.getRequiredEnv("GITHUB_CALLBACK_URL"),
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to exchange GitHub OAuth code");
      }

      const data = (await response.json()) as GithubAccessTokenResponse;

      if (data.error) {
        throw new Error(data.error_description ?? data.error);
      }

      if (!data.access_token) {
        throw new Error("GitHub did not return an access token");
      }

      return data.access_token;
    } catch (error) {
      console.error("OAuth Error:", error);
      throw error;
    }
  }

  async getGithubUser(accessToken: string): Promise<GithubUser> {
    const response = await fetch("https://api.github.com/user", {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${accessToken}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch GitHub user");
    }

    const githubUser = (await response.json()) as GithubUser;

    if (!githubUser.email) {
      githubUser.email = await this.getGithubPrimaryEmail(accessToken);
    }

    return githubUser;
  }

  async findOrCreateUser(
    githubUser: GithubUser,
    accessToken: string,
  ): Promise<User> {
    return conn.user.upsert({
      where: {
        githubId: String(githubUser.id),
      },
      update: {
        username: githubUser.login,
        email: githubUser.email ?? "",
        avatarUrl: githubUser.avatar_url,
        accessToken,
      },
      create: {
        githubId: String(githubUser.id),
        username: githubUser.login,
        email: githubUser.email ?? "",
        avatarUrl: githubUser.avatar_url,
        accessToken,
        refreshToken: "",
      },
    });
  }

  async createSession(userId: string): Promise<string> {
    const sessionId = randomBytes(32).toString("hex");

    await rd.set(`session:${sessionId}`, userId, {
      EX: 7 * 24 * 60 * 60,
    });

    return sessionId;
  }

  async getCurrentUser(sessionId: string): Promise<User | null> {
    const userId = await rd.get(`session:${sessionId}`);

    if (!userId) {
      return null;
    }

    return conn.user.findUnique({
      where: {
        id: userId,
      },
    });
  }

  async getUserById(userId: string): Promise<User | null> {
    return conn.user.findUnique({
      where: {
        id: userId,
      },
    });
  }

  async logout(sessionId: string): Promise<void> {
    await rd.del(`session:${sessionId}`);
  }

  private async getGithubPrimaryEmail(
    accessToken: string,
  ): Promise<string | null> {
    const response = await fetch("https://api.github.com/user/emails", {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${accessToken}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (!response.ok) {
      return null;
    }

    const emails = (await response.json()) as GithubEmail[];
    const primaryEmail = emails.find(
      (email) => email.primary && email.verified,
    );

    return primaryEmail?.email ?? null;
  }

  private getRequiredEnv(key: string): string {
    const value = process.env[key];

    if (!value) {
      throw new Error(`Missing environment variable: ${key}`);
    }

    return value;
  }
}

const authService = new AuthService();
export { authService, AuthService };
