import bcrypt from "bcryptjs";
import { type NextRequest } from "next/server";
import { getAuthUser, requireAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { sendError, sendSuccess } from "@/lib/response";

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

// GET /api/auth/profile
export async function GET(request: NextRequest) {
    try {
        const authUser = await getAuthUser(request);
        const authError = requireAuth(authUser);
        if (authError) {
            return authError;
        }

        const user = await prisma.user.findUnique({
            where: { id: authUser!.userId },
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
            return sendError("User not found", 404);
        }

        return sendSuccess({ user }, "Profile retrieved successfully");
    } catch (error) {
        console.error("Get profile error:", error);
        return sendError("Failed to get profile", 500);
    }
}

// PUT /api/auth/profile
export async function PUT(request: NextRequest) {
    try {
        const authUser = await getAuthUser(request);
        const authError = requireAuth(authUser);
        if (authError) {
            return authError;
        }

        const body = await request.json();
        const { username, currentPassword, newPassword, confirmPassword } = body;

        const updateData: { username?: string; password?: string } = {};

        if (username) {
            if (username.trim().length < 3) {
                return sendError("Username must be at least 3 characters", 400);
            }

            const existingUser = await prisma.user.findFirst({
                where: {
                    username,
                    NOT: { id: authUser!.userId },
                },
            });

            if (existingUser) {
                return sendError("Username already exists", 400);
            }

            updateData.username = username.trim();
        }

        if (newPassword) {
            if (!currentPassword) {
                return sendError("Current password is required", 400);
            }

            const user = await prisma.user.findUnique({
                where: { id: authUser!.userId },
                select: { password: true },
            });

            if (!user) {
                return sendError("User not found", 404);
            }

            const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
            if (!isCurrentPasswordValid) {
                return sendError("Current password is incorrect", 400);
            }

            if (newPassword !== confirmPassword) {
                return sendError("New passwords do not match", 400);
            }

            if (newPassword.length < 6) {
                return sendError("New password must be at least 6 characters", 400);
            }

            updateData.password = await bcrypt.hash(newPassword, 10);
        }

        if (Object.keys(updateData).length === 0) {
            return sendError("No valid fields to update", 400);
        }

        const updatedUser = await prisma.user.update({
            where: { id: authUser!.userId },
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

        return sendSuccess({ user: updatedUser }, "Profile updated successfully");
    } catch (error) {
        console.error("Update profile error:", error);
        return sendError("Failed to update profile", 500);
    }
}
