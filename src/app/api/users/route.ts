import bcrypt from "bcryptjs";
import { type NextRequest } from "next/server";
import { getAuthUser, requireAdmin } from "@/lib/auth";
import { broadcastEvent } from "@/lib/events";
import prisma from "@/lib/prisma";
import { sendError, sendSuccess } from "@/lib/response";
import { validateEmail, validateRequired } from "@/lib/validation";

// GET /api/users - List all users (Admin only)
export async function GET(request: NextRequest) {
    try {
        const authUser = await getAuthUser(request);
        const authError = requireAdmin(authUser);
        if (authError) {
            return authError;
        }

        const { searchParams } = new URL(request.url);
        const page = Number(searchParams.get("page")) || 1;
        const limit = Number(searchParams.get("limit")) || 10;
        const search = searchParams.get("search") || "";

        const skip = (page - 1) * limit;

        const where = search
            ? {
                  OR: [{ email: { contains: search } }, { username: { contains: search } }],
              }
            : {};

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                skip,
                take: limit,
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

        return sendSuccess(
            {
                users,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit),
                },
            },
            "Users retrieved successfully",
        );
    } catch (error) {
        console.error("Get users error:", error);
        return sendError("Failed to get users", 500);
    }
}

// POST /api/users - Create new user (Admin only)
export async function POST(request: NextRequest) {
    try {
        const authUser = await getAuthUser(request);
        const authError = requireAdmin(authUser);
        if (authError) {
            return authError;
        }

        const body = await request.json();
        const { email, username, password, role = "USER", rtmpQuota = 1 } = body;

        const validationErrors = validateRequired(body, ["email", "username", "password"]);
        if (validationErrors.length > 0) {
            return sendError(validationErrors.join(", "), 400);
        }

        if (!validateEmail(email)) {
            return sendError("Invalid email format", 400);
        }

        if (password.length < 6) {
            return sendError("Password must be at least 6 characters", 400);
        }

        if (!["ADMIN", "USER"].includes(role)) {
            return sendError("Invalid role", 400);
        }

        if (rtmpQuota < 0 || rtmpQuota > 999) {
            return sendError("RTMP quota must be between 0 and 999", 400);
        }

        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [{ email }, { username }],
            },
        });

        if (existingUser) {
            return sendError("Email or username already exists", 400);
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

        // Broadcast event to all connected clients
        broadcastEvent("users");

        return sendSuccess({ user }, "User created successfully", 201);
    } catch (error) {
        console.error("Create user error:", error);
        return sendError("Failed to create user", 500);
    }
}
