import { authService } from "../services/auth.service.js";
const GITHUB_STATE_COOKIE = "github_oauth_state";
const SESSION_COOKIE = "code_review_session";
const isProduction = process.env.NODE_ENV === "production";
export const loginWithGithub = (_req, res, next) => {
    try {
        const state = authService.createGithubState();
        const githubAuthUrl = authService.getGithubAuthUrl(state);
        res.cookie(GITHUB_STATE_COOKIE, state, {
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
        const storedState = getCookie(req, GITHUB_STATE_COOKIE);
        if (typeof code !== "string") {
            res.status(400).json({ message: "Missing GitHub OAuth code" });
            return;
        }
        if (typeof state !== "string" ||
            !storedState ||
            storedState !== state) {
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
        const sessionId = getCookie(req, SESSION_COOKIE);
        if (!sessionId) {
            res.status(401).json({ message: "Not authenticated" });
            return;
        }
        const user = await authService.getCurrentUser(sessionId);
        if (!user) {
            res.clearCookie(SESSION_COOKIE, {
                path: "/",
                sameSite: "lax",
                secure: isProduction,
            });
            res.status(401).json({ message: "Not authenticated" });
            return;
        }
        res.json({ user: toSafeUser(user) });
    }
    catch (error) {
        next(error);
    }
};
export const logout = (req, res, next) => {
    try {
        const sessionId = getCookie(req, SESSION_COOKIE);
        if (sessionId) {
            authService.logout(sessionId);
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
const getCookie = (req, cookieName) => {
    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) {
        return undefined;
    }
    const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());
    const targetCookie = cookies.find((cookie) => cookie.startsWith(`${cookieName}=`));
    if (!targetCookie) {
        return undefined;
    }
    return decodeURIComponent(targetCookie.slice(cookieName.length + 1));
};
const getClientUrl = () => {
    return process.env.CLIENT_URL ?? "http://localhost:5173";
};
const toSafeUser = (user) => {
    return {
        id: user.id,
        githubId: user.githubId,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    };
};
//# sourceMappingURL=auth.controller.js.map