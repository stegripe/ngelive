import bcrypt from "bcryptjs";
import { type Request, type Response } from "express";
import prisma from "../config/database";
import { generateToken } from "../config/jwt";
import { type AuthRequest } from "../middleware/auth";
import { sendError, sendSuccess } from "../utils/response";
import { validateEmail, validateRequired } from "../utils/validation";

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        const validationErrors = validateRequired(req.body, ["email", "password"]);
        if (validationErrors.length > 0) {
            return sendError(res, validationErrors.join(", "), 400);
        }

        if (!validateEmail(email)) {
            return sendError(res, "Invalid email format", 400);
        }

        const user = await prisma.user.findUnique({
            where: { email },
            select: {
                id: true,
                email: true,
                username: true,
                password: true,
                role: true,
                isActive: true,
                rtmpQuota: true,
            },
        });

        if (!user) {
            return sendError(res, "Invalid email or password", 401);
        }

        if (!user.isActive) {
            return sendError(res, "Account is deactivated", 401);
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return sendError(res, "Invalid email or password", 401);
        }

        const token = generateToken({
            userId: user.id,
            email: user.email,
            role: user.role,
        });

        sendSuccess(
            res,
            {
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    username: user.username,
                    role: user.role,
                    rtmpQuota: user.rtmpQuota,
                },
            },
            "Login successful"
        );
    } catch (error) {
        console.error("Login error:", error);
        sendError(res, "Login failed", 500);
    }
};

export const register = async (req: Request, res: Response) => {
    try {
        const { email, username, password, confirmPassword } = req.body;

        const validationErrors = validateRequired(req.body, [
            "email",
            "username",
            "password",
            "confirmPassword",
        ]);
        if (validationErrors.length > 0) {
            return sendError(res, validationErrors.join(", "), 400);
        }

        if (!validateEmail(email)) {
            return sendError(res, "Invalid email format", 400);
        }

        if (password !== confirmPassword) {
            return sendError(res, "Passwords do not match", 400);
        }

        if (password.length < 6) {
            return sendError(res, "Password must be at least 6 characters", 400);
        }

        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [{ email }, { username }],
            },
        });

        if (existingUser) {
            return sendError(res, "Email or username already exists", 400);
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                email,
                username,
                password: hashedPassword,
                role: "USER",
                rtmpQuota: 1,
            },
            select: {
                id: true,
                email: true,
                username: true,
                role: true,
                rtmpQuota: true,
                createdAt: true,
            },
        });

        sendSuccess(res, { user }, "Registration successful", 201);
    } catch (error) {
        console.error("Registration error:", error);
        sendError(res, "Registration failed", 500);
    }
};

export const getProfile = async (req: AuthRequest, res: Response) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user?.userId },
            select: {
                id: true,
                email: true,
                username: true,
                role: true,
                rtmpQuota: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
                _count: {
                    select: {
                        rtmpStreams: true,
                        videos: true,
                    },
                },
            },
        });

        if (!user) {
            return sendError(res, "User not found", 404);
        }

        sendSuccess(res, { user }, "Profile retrieved successfully");
    } catch (error) {
        console.error("Get profile error:", error);
        sendError(res, "Failed to get profile", 500);
    }
};

const handlePasswordUpdate = async (
    req: AuthRequest,
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
): Promise<{ password?: string; error?: { message: string; code: number } }> => {
    if (!currentPassword) {
        return { error: { message: "Current password is required", code: 400 } };
    }

    const user = await prisma.user.findUnique({
        where: { id: req.user?.userId },
        select: { password: true },
    });

    if (!user) {
        return { error: { message: "User not found", code: 404 } };
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
        return { error: { message: "Current password is incorrect", code: 400 } };
    }

    if (newPassword !== confirmPassword) {
        return { error: { message: "New passwords do not match", code: 400 } };
    }

    if (newPassword.length < 6) {
        return { error: { message: "New password must be at least 6 characters", code: 400 } };
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    return { password: hashedPassword };
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
    try {
        const { username, currentPassword, newPassword, confirmPassword } = req.body;

        const updateData: { username?: string; password?: string } = {};

        if (username) {
            if (username.trim().length < 3) {
                return sendError(res, "Username must be at least 3 characters", 400);
            }

            const existingUser = await prisma.user.findFirst({
                where: {
                    username,
                    NOT: { id: req.user?.userId },
                },
            });

            if (existingUser) {
                return sendError(res, "Username already exists", 400);
            }

            updateData.username = username.trim();
        }

        if (newPassword) {
            const passwordResult = await handlePasswordUpdate(
                req,
                currentPassword,
                newPassword,
                confirmPassword
            );
            if (passwordResult.error) {
                return sendError(res, passwordResult.error.message, passwordResult.error.code);
            }
            if (passwordResult.password) {
                updateData.password = passwordResult.password;
            }
        }

        if (Object.keys(updateData).length === 0) {
            return sendError(res, "No valid fields to update", 400);
        }

        const updatedUser = await prisma.user.update({
            where: { id: req.user?.userId },
            data: updateData,
            select: {
                id: true,
                email: true,
                username: true,
                role: true,
                rtmpQuota: true,
                updatedAt: true,
            },
        });

        sendSuccess(res, { user: updatedUser }, "Profile updated successfully");
    } catch (error) {
        console.error("Update profile error:", error);
        sendError(res, "Failed to update profile", 500);
    }
};
