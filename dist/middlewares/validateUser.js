import { authService } from "../services/auth.service.js";
const SESSION_COOKIE = "code_review_session";
const isProduction = process.env.NODE_ENV === "production";
export const attachCurrentUser = async (req, res, next) => {
    try {
        await setCurrentUserOnRequest(req, res);
        next();
    }
    catch (error) {
        next(error);
    }
};
export const requireAuth = async (req, res, next) => {
    try {
        const hasCurrentUser = await setCurrentUserOnRequest(req, res);
        if (!hasCurrentUser) {
            res.status(401).json({ message: "Not authenticated" });
            return;
        }
        next();
    }
    catch (error) {
        next(error);
    }
};
export const validateRequest = requireAuth;
const setCurrentUserOnRequest = async (req, res) => {
    const sessionId = getSignedCookie(req, SESSION_COOKIE);
    if (!sessionId) {
        return false;
    }
    const user = await authService.getCurrentUser(sessionId);
    if (!user) {
        clearSessionCookie(res);
        return false;
    }
    req.sessionId = sessionId;
    req.user = toCurrentUser(user);
    return true;
};
const getSignedCookie = (req, cookieName) => {
    const cookie = req.signedCookies[cookieName];
    return typeof cookie === "string" ? cookie : undefined;
};
const clearSessionCookie = (res) => {
    res.clearCookie(SESSION_COOKIE, {
        path: "/",
        sameSite: "lax",
        secure: isProduction,
    });
};
const toCurrentUser = (user) => {
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
//# sourceMappingURL=validateUser.js.map