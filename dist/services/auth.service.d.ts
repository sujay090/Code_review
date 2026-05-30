import type { User } from "../generated/prisma/client.js";
export type GithubUser = {
    id: number;
    login: string;
    name: string | null;
    avatar_url: string;
    email: string | null;
};
interface IAuthService {
    createGithubState(): string;
    getGithubAuthUrl(state: string): string;
    exchangeCodeForToken(code: string): Promise<string>;
    getGithubUser(accessToken: string): Promise<GithubUser>;
    findOrCreateUser(githubUser: GithubUser, accessToken: string): Promise<User>;
    createSession(userId: string): Promise<string>;
    getCurrentUser(sessionId: string): Promise<User | null>;
    logout(sessionId: string): void;
}
declare class AuthService implements IAuthService {
    createGithubState(): string;
    getGithubAuthUrl(state: string): string;
    exchangeCodeForToken(code: string): Promise<string>;
    getGithubUser(accessToken: string): Promise<GithubUser>;
    findOrCreateUser(githubUser: GithubUser, accessToken: string): Promise<User>;
    createSession(userId: string): Promise<string>;
    getCurrentUser(sessionId: string): Promise<User | null>;
    logout(sessionId: string): void;
    private getGithubPrimaryEmail;
    private getRequiredEnv;
}
declare const authService: AuthService;
export { authService, AuthService };
//# sourceMappingURL=auth.service.d.ts.map