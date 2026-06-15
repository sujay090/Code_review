import type { NextFunction, Request, Response } from "express";
import { authService } from "../services/auth.service.js";

const GITHUB_STATE_COOKIE = "github_oauth_state";
const SESSION_COOKIE = "code_review_session";
const isProduction = process.env.NODE_ENV === "production";

export const loginWithGithub = (
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
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
  } catch (error) {
    next(error);
  }
};

export const githubCallback = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const code = req.query.code as string;
    const state = req.query.state as string;
    const storedState = getSignedCookie(req, GITHUB_STATE_COOKIE);

    if (!storedState || storedState !== state) {
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
  } catch (error) {
    next(error);
  }
};

export const getMe = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    res.json({ user: req.user });
  } catch (error) {
    next(error);
  }
};

export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
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
  } catch (error) {
    next(error);
  }
};

const getSignedCookie = (
  req: Request,
  cookieName: string,
): string | undefined => {
  const cookie = req.signedCookies[cookieName];

  return typeof cookie === "string" ? cookie : undefined;
};

const getClientUrl = (): string => {
  return process.env.CLIENT_URL ?? "http://localhost:5173";
};
