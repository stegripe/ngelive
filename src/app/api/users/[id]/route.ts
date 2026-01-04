import bcrypt from "bcryptjs";
import { type NextRequest } from "next/server";
import { getAuthUser, requireAdmin } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { sendError, sendSuccess } from "@/lib/response";
import { validateEmail } from "@/lib/validation";

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET /api/users/[id] - Get user by ID (Admin only)
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const authUser = await getAuthUser(request);
        const authError = requireAdmin(authUser);
        if (authError) {
            return authError;
        }

        const { id } = await params;

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
            return sendError("User not found", 404);
        }

        return sendSuccess({ user }, "User retrieved successfully");
    } catch (error) {
        console.error("Get user by ID error:", error);
        return sendError("Failed to get user", 500);
    }
}

// PUT /api/users/[id] - Update user (Admin only)
export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const authUser = await getAuthUser(request);
        const authError = requireAdmin(authUser);
        if (authError) {
            return authError;
        }

        const { id } = await params;
        const body = await request.json();
        const { username, email, role, rtmpQuota, isActive, password } = body;

        const user = await prisma.user.findUnique({
            where: { id },
            select: { id: true, email: true, username: true },
        });

        if (!user) {
            return sendError("User not found", 404);
        }

        const updateData: {
            username?: string;
            email?: string;
            role?: "ADMIN" | "USER";
            rtmpQuota?: number;
            isActive?: boolean;
            password?: string;
        } = {};

        // Check username
        if (username && username !== user.username) {
            const existingUser = await prisma.user.findFirst({
                where: {
                    username,
                    NOT: { id },
                },
            });
            if (existingUser) {
                return sendError("Username already exists", 400);
            }
            updateData.username = username;
        }

        // Check email
        if (email && email !== user.email) {
            if (!validateEmail(email)) {
                return sendError("Invalid email format", 400);
            }
            const existingUser = await prisma.user.findFirst({
                where: {
                    email,
                    NOT: { id },
                },
            });
            if (existingUser) {
                return sendError("Email already exists", 400);
            }
            updateData.email = email;
        }

        if (role && ["ADMIN", "USER"].includes(role)) {
            updateData.role = role;
        }

        if (rtmpQuota !== undefined) {
            if (rtmpQuota < 0 || rtmpQuota > 999) {
                return sendError("RTMP quota must be between 0 and 999", 400);
            }
            updateData.rtmpQuota = rtmpQuota;
        }

        if (isActive !== undefined) {
            updateData.isActive = Boolean(isActive);
        }

        if (password) {
            if (password.length < 6) {
                return sendError("Password must be at least 6 characters", 400);
            }
            updateData.password = await bcrypt.hash(password, 10);
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

        return sendSuccess({ user: updatedUser }, "User updated successfully");
    } catch (error) {
        console.error("Update user error:", error);
        return sendError("Failed to update user", 500);
    }
}

// DELETE /api/users/[id] - Delete user (Admin only)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const authUser = await getAuthUser(request);
        const authError = requireAdmin(authUser);
        if (authError) {
            return authError;
        }

        const { id } = await params;

        if (id === authUser!.userId) {
            return sendError("Cannot delete your own account", 400);
        }

        const user = await prisma.user.findUnique({
            where: { id },
            select: { id: true, username: true },
        });

        if (!user) {
            return sendError("User not found", 404);
        }

        await prisma.user.delete({
            where: { id },
        });

        return sendSuccess({ deletedUser: user }, "User deleted successfully");
    } catch (error) {
        console.error("Delete user error:", error);
        return sendError("Failed to delete user", 500);
    }
}
