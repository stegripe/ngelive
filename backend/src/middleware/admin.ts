import type { NextFunction, Response } from "express";
import { sendError } from "../utils/response";
import type { AuthRequest } from "./auth";

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.user?.role !== "ADMIN") {
        return sendError(res, "Admin access required", 403);
    }
    next();
};
