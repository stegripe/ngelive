import nodeProcess from "node:process";
import jwt from "jsonwebtoken";

const JWT_SECRET = nodeProcess.env.JWT_SECRET || "your-secret-key";

export interface JwtPayload {
    userId: string;
    email: string;
    role: string;
}

export const generateToken = (payload: JwtPayload): string => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
};

export const verifyToken = (token: string): JwtPayload => {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
};
