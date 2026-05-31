import type { NextFunction, Request, Response } from "express";
import { authService } from "../services/auth.service.js";
import type { User } from "../generated/prisma/client.js";

type CurrentUser = Omit<User, "accessToken" | "refreshToken">;

declare module "express-serve-static-core" {
  interface Request {
    user?: CurrentUser;
    sessionId?: string;
  }
}

const SESSION_COOKIE = "code_review_session";
const isProduction = process.env.NODE_ENV === "production";

export const attachCurrentUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    await setCurrentUserOnRequest(req, res);
    next();
  } catch (error) {
    next(error);
  }
};

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const hasCurrentUser = await setCurrentUserOnRequest(req, res);

    if (!hasCurrentUser) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
};

export const validateRequest = requireAuth;

const setCurrentUserOnRequest = async (
  req: Request,
  res: Response,
): Promise<boolean> => {
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

const getSignedCookie = (
  req: Request,
  cookieName: string,
): string | undefined => {
  const cookie = req.signedCookies[cookieName];

  return typeof cookie === "string" ? cookie : undefined;
};

const clearSessionCookie = (res: Response) => {
  res.clearCookie(SESSION_COOKIE, {
    path: "/",
    sameSite: "lax",
    secure: isProduction,
  });
};

const toCurrentUser = (user: User): CurrentUser => {
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
