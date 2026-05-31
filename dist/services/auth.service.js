import { randomBytes } from "node:crypto";
import { conn } from "../db/DB.js";
const sessions = new Map();
class AuthService {
    createGithubState() {
        return randomBytes(32).toString("hex");
    }
    getGithubAuthUrl(state) {
        const url = new URL("https://github.com/login/oauth/authorize");
        url.searchParams.set("client_id", this.getRequiredEnv("GITHUB_CLIENT_ID"));
        url.searchParams.set("redirect_uri", this.getRequiredEnv("GITHUB_CALLBACK_URL"));
        url.searchParams.set("scope", "read:user user:email");
        url.searchParams.set("state", state);
        return url.toString();
    }
    async exchangeCodeForToken(code) {
        try {
            const response = await fetch("https://github.com/login/oauth/access_token", {
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
            });
            if (!response.ok) {
                throw new Error("Failed to exchange GitHub OAuth code");
            }
            const data = (await response.json());
            if (data.error) {
                throw new Error(data.error_description ?? data.error);
            }
            if (!data.access_token) {
                throw new Error("GitHub did not return an access token");
            }
            return data.access_token;
        }
        catch (error) {
            console.error("OAuth Error:", error);
            throw error;
        }
    }
    async getGithubUser(accessToken) {
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
        const githubUser = (await response.json());
        if (!githubUser.email) {
            githubUser.email = await this.getGithubPrimaryEmail(accessToken);
        }
        return githubUser;
    }
    async findOrCreateUser(githubUser, accessToken) {
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
    async createSession(userId) {
        const sessionId = randomBytes(32).toString("hex");
        sessions.set(sessionId, {
            userId,
            createdAt: new Date(),
        });
        return sessionId;
    }
    async getCurrentUser(sessionId) {
        const session = sessions.get(sessionId);
        if (!session) {
            return null;
        }
        return conn.user.findUnique({
            where: {
                id: session.userId,
            },
        });
    }
    logout(sessionId) {
        sessions.delete(sessionId);
    }
    async getGithubPrimaryEmail(accessToken) {
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
        const emails = (await response.json());
        const primaryEmail = emails.find((email) => email.primary && email.verified);
        return primaryEmail?.email ?? null;
    }
    getRequiredEnv(key) {
        const value = process.env[key];
        if (!value) {
            throw new Error(`Missing environment variable: ${key}`);
        }
        return value;
    }
}
const authService = new AuthService();
export { authService, AuthService };
//# sourceMappingURL=auth.service.js.map