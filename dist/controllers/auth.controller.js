import { authService } from "../services/auth.service.js";
const GITHUB_STATE_COOKIE = "github_oauth_state";
const SESSION_COOKIE = "code_review_session";
const isProduction = process.env.NODE_ENV === "production";
export const loginWithGithub = (_req, res, next) => {
    try {
        const state = authService.createGithubState();
        const githubAuthUrl = authService.getGithubAuthUrl(state);
        res.cookie(GITHUB_STATE_COOKIE, state, {
            signed: true,
            httpOnly: true,
            maxAge: 10 * 60 * 1000,
            path: "/api/auth",
            sameSite: "lax",
            secure: isProduction,
        });
        res.redirect(githubAuthUrl);
    }
    catch (error) {
        next(error);
    }
};
export const githubCallback = async (req, res, next) => {
    try {
        const code = req.query.code;
        const state = req.query.state;
        const storedState = getSignedCookie(req, GITHUB_STATE_COOKIE);
        if (typeof code !== "string") {
            res.status(400).json({ message: "Missing GitHub OAuth code" });
            return;
        }
        if (typeof state !== "string" || !storedState || storedState !== state) {
            res.status(401).json({ message: "Invalid GitHub OAuth state" });
            return;
        }
        res.clearCookie(GITHUB_STATE_COOKIE, {
            path: "/api/auth",
            sameSite: "lax",
            secure: isProduction,
        });
        const accessToken = await authService.exchangeCodeForToken(code);
        const githubUser = await authService.getGithubUser(accessToken);
        const user = await authService.findOrCreateUser(githubUser, accessToken);
        const sessionId = await authService.createSession(user.id);
        res.cookie(SESSION_COOKIE, sessionId, {
            signed: true,
            httpOnly: true,
            maxAge: 7 * 24 * 60 * 60 * 1000,
            path: "/",
            sameSite: "lax",
            secure: isProduction,
        });
        res.redirect(`${getClientUrl()}/dashboard`);
    }
    catch (error) {
        next(error);
    }
};
export const getMe = async (req, res, next) => {
    try {
        res.json({ user: req.user });
    }
    catch (error) {
        next(error);
    }
};
export const logout = async (req, res, next) => {
    try {
        const sessionId = getSignedCookie(req, SESSION_COOKIE);
        if (sessionId) {
            await authService.logout(sessionId);
        }
        res.clearCookie(SESSION_COOKIE, {
            path: "/",
            sameSite: "lax",
            secure: isProduction,
        });
        res.status(204).send();
    }
    catch (error) {
        next(error);
    }
};
const getSignedCookie = (req, cookieName) => {
    const cookie = req.signedCookies[cookieName];
    return typeof cookie === "string" ? cookie : undefined;
};
const getClientUrl = () => {
    return process.env.CLIENT_URL ?? "http://localhost:5173";
};
//# sourceMappingURL=auth.controller.js.map