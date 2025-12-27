import { type NextFunction, type Request, type Response } from "express";
import { verifyToken } from "../config/jwt";
import { sendError } from "../utils/response";

export interface AuthRequest extends Request {
    user?: {
        userId: string;
        email: string;
        role: string;
    };
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(" ")[1];

    if (!token) {
        return sendError(res, "Access token required", 401);
    }

    try {
        const decoded = verifyToken(token);
        req.user = decoded;
        next();
    } catch (_error) {
        return sendError(res, "Invalid or expired token", 401);
    }
};
