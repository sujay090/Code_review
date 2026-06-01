import { authService } from "../services/auth.service.js";
import { githubService } from "../services/github.service.js";
export const getRepositories = async (req, res, next) => {
    try {
        if (!req.user) {
            res.status(401).json({ message: "Not authenticated" });
            return;
        }
        const page = parsePositiveNumber(req.query.page, 1);
        const limit = Math.min(parsePositiveNumber(req.query.limit, 10), 30);
        const user = await authService.getUserById(req.user.id);
        if (!user?.accessToken) {
            res.status(401).json({ message: "GitHub account is not connected" });
            return;
        }
        const repositories = await githubService.getUserRepositories(user.accessToken, page, limit);
        res.json({
            page,
            limit,
            repositories,
        });
    }
    catch (error) {
        next(error);
    }
};
const parsePositiveNumber = (value, fallback) => {
    if (typeof value !== "string") {
        return fallback;
    }
    const parsedValue = Number(value);
    if (!Number.isInteger(parsedValue) || parsedValue < 1) {
        return fallback;
    }
    return parsedValue;
};
//# sourceMappingURL=github.controller.js.map