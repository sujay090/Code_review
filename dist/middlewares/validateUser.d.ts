import type { NextFunction, Request, Response } from "express";
import type { User } from "../generated/prisma/client.js";
type CurrentUser = Omit<User, "accessToken" | "refreshToken">;
declare module "express-serve-static-core" {
    interface Request {
        user?: CurrentUser;
        sessionId?: string;
    }
}
export declare const attachCurrentUser: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const requireAuth: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const validateRequest: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export {};
//# sourceMappingURL=validateUser.d.ts.map