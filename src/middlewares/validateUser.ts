import type { NextFunction, Request, Response } from "express";

export function validateRequest(
  req: Request,
  res: Response,
  next: NextFunction,
) {
    const { code_review_session } = req.signedCookies;
    
  return;
}
