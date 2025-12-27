import bcrypt from "bcryptjs";
import { type Response } from "express";
import prisma from "../config/database";
import { type AuthRequest } from "../middleware/auth";
import { sendError, sendSuccess } from "../utils/response";
import { validateEmail, validateRequired } from "../utils/validation";

export const getUsers = async (req: AuthRequest, res: Response) => {
    try {
        const { page = 1, limit = 10, search = "" } = req.query;

        const skip = (Number(page) - 1) * Number(limit);

        const where = search
            ? {
                  OR: [
                      { email: { contains: search as string } },
                      { username: { contains: search as string } },
                  ],
              }
            : {};

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                skip,
                take: Number(limit),
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
                orderBy: { createdAt: "desc" },
            }),
            prisma.user.count({ where }),
        ]);

        sendSuccess(
            res,
            {
                users,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    pages: Math.ceil(total / Number(limit)),
                },
            },
            "Users retrieved successfully"
        );
    } catch (error) {
        console.error("Get users error:", error);
        sendError(res, "Failed to get users", 500);
    }
};

export const getUserById = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        const user = await prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                email: true,
                username: true,
                role: true,
                rtmpQuota: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
                rtmpStreams: {
                    select: {
                        id: true,
                        name: true,
                        isActive: true,
                        isStreaming: true,
                        createdAt: true,
                    },
                },
                videos: {
                    select: {
                        id: true,
                        filename: true,
                        originalName: true,
                        size: true,
                        duration: true,
                        uploadedAt: true,
                    },
                },
            },
        });

        if (!user) {
            return sendError(res, "User not found", 404);
        }

        sendSuccess(res, { user }, "User retrieved successfully");
    } catch (error) {
        console.error("Get user by ID error:", error);
        sendError(res, "Failed to get user", 500);
    }
};

export const createUser = async (req: AuthRequest, res: Response) => {
    try {
        const { email, username, password, role = "USER", rtmpQuota = 1 } = req.body;

        const validationErrors = validateRequired(req.body, ["email", "username", "password"]);
        if (validationErrors.length > 0) {
            return sendError(res, validationErrors.join(", "), 400);
        }

        if (!validateEmail(email)) {
            return sendError(res, "Invalid email format", 400);
        }

        if (password.length < 6) {
            return sendError(res, "Password must be at least 6 characters", 400);
        }

        if (!["ADMIN", "USER"].includes(role)) {
            return sendError(res, "Invalid role", 400);
        }

        if (rtmpQuota < 0 || rtmpQuota > 999) {
            return sendError(res, "RTMP quota must be between 0 and 999", 400);
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
                role,
                rtmpQuota,
            },
            select: {
                id: true,
                email: true,
                username: true,
                role: true,
                rtmpQuota: true,
                isActive: true,
                createdAt: true,
            },
        });

        sendSuccess(res, { user }, "User created successfully", 201);
    } catch (error) {
        console.error("Create user error:", error);
        sendError(res, "Failed to create user", 500);
    }
};

const checkAndUpdateUsername = async (
    username: string,
    userId: string,
    currentUsername: string
) => {
    if (username && username !== currentUsername) {
        const existingUser = await prisma.user.findFirst({
            where: {
                username,
                NOT: { id: userId },
            },
        });
        if (existingUser) {
            throw new Error("Username already exists");
        }
        return username;
    }
    return undefined;
};

const checkAndUpdateEmail = async (email: string, userId: string, currentEmail: string) => {
    if (email && email !== currentEmail) {
        if (!validateEmail(email)) {
            throw new Error("Invalid email format");
        }
        const existingUser = await prisma.user.findFirst({
            where: {
                email,
                NOT: { id: userId },
            },
        });
        if (existingUser) {
            throw new Error("Email already exists");
        }
        return email;
    }
    return undefined;
};

const checkAndUpdatePassword = async (password: string) => {
    if (password) {
        if (password.length < 6) {
            throw new Error("Password must be at least 6 characters");
        }
        return await bcrypt.hash(password, 10);
    }
    return undefined;
};

export const updateUser = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { username, email, role, rtmpQuota, isActive, password } = req.body;

        const user = await prisma.user.findUnique({
            where: { id },
            select: { id: true, email: true, username: true },
        });

        if (!user) {
            return sendError(res, "User not found", 404);
        }

        const updateData: {
            username?: string;
            email?: string;
            role?: "ADMIN" | "USER";
            rtmpQuota?: number;
            isActive?: boolean;
            password?: string;
        } = {};

        try {
            updateData.username = await checkAndUpdateUsername(username, id, user.username);
        } catch (err) {
            return sendError(res, (err as Error).message, 400);
        }

        try {
            updateData.email = await checkAndUpdateEmail(email, id, user.email);
        } catch (err) {
            return sendError(res, (err as Error).message, 400);
        }

        if (role && ["ADMIN", "USER"].includes(role)) {
            updateData.role = role;
        }

        if (rtmpQuota !== undefined) {
            if (rtmpQuota < 0 || rtmpQuota > 999) {
                return sendError(res, "RTMP quota must be between 0 and 999", 400);
            }
            updateData.rtmpQuota = rtmpQuota;
        }

        if (isActive !== undefined) {
            updateData.isActive = Boolean(isActive);
        }

        try {
            updateData.password = await checkAndUpdatePassword(password);
        } catch (err) {
            return sendError(res, (err as Error).message, 400);
        }

        const updatedUser = await prisma.user.update({
            where: { id },
            data: updateData,
            select: {
                id: true,
                email: true,
                username: true,
                role: true,
                rtmpQuota: true,
                isActive: true,
                updatedAt: true,
            },
        });

        sendSuccess(res, { user: updatedUser }, "User updated successfully");
    } catch (error) {
        console.error("Update user error:", error);
        sendError(res, "Failed to update user", 500);
    }
};

export const deleteUser = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        if (id === req.user?.userId) {
            return sendError(res, "Cannot delete your own account", 400);
        }

        const user = await prisma.user.findUnique({
            where: { id },
            select: { id: true, username: true },
        });

        if (!user) {
            return sendError(res, "User not found", 404);
        }

        await prisma.user.delete({
            where: { id },
        });

        sendSuccess(res, { deletedUser: user }, "User deleted successfully");
    } catch (error) {
        console.error("Delete user error:", error);
        sendError(res, "Failed to delete user", 500);
    }
};
