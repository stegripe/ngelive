import { type NextRequest } from "next/server";
import { getAuthUser, requireAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { sendError, sendSuccess } from "@/lib/response";
import { validateRequired } from "@/lib/validation";
import { generateStreamKey } from "@/lib/rtmp";

// GET /api/rtmp - List RTMP streams
export async function GET(request: NextRequest) {
    try {
        const authUser = await getAuthUser(request);
        const authError = requireAuth(authUser);
        if (authError) return authError;

        const { searchParams } = new URL(request.url);
        const page = Number(searchParams.get("page")) || 1;
        const limit = Number(searchParams.get("limit")) || 10;
        const skip = (page - 1) * limit;

        const where = authUser!.role === "ADMIN" ? {} : { userId: authUser!.userId };

        const [streams, total] = await Promise.all([
            prisma.rtmpStream.findMany({
                where,
                skip,
                take: limit,
                include: {
                    user: {
                        select: {
                            id: true,
                            username: true,
                            email: true,
                        },
                    },
                    streamVideos: {
                        include: {
                            video: {
                                select: {
                                    id: true,
                                    filename: true,
                                    originalName: true,
                                    duration: true,
                                    resolution: true,
                                    size: true,
                                    path: true,
                                    user: {
                                        select: {
                                            id: true,
                                            username: true,
                                            email: true,
                                        },
                                    },
                                },
                            },
                        },
                        orderBy: { order: "asc" },
                    },
                    _count: {
                        select: {
                            streamLogs: true,
                        },
                    },
                },
                orderBy: { createdAt: "desc" },
            }),
            prisma.rtmpStream.count({ where }),
        ]);

        return sendSuccess(
            {
                streams,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit),
                },
            },
            "RTMP streams retrieved successfully"
        );
    } catch (error) {
        console.error("Get RTMP streams error:", error);
        return sendError("Failed to get RTMP streams", 500);
    }
}

// POST /api/rtmp - Create RTMP stream
export async function POST(request: NextRequest) {
    try {
        const authUser = await getAuthUser(request);
        const authError = requireAuth(authUser);
        if (authError) return authError;

        const body = await request.json();
        const { name, rtmpUrl } = body;

        const validationErrors = validateRequired(body, ["name", "rtmpUrl"]);
        if (validationErrors.length > 0) {
            return sendError(validationErrors.join(", "), 400);
        }

        // Check user's RTMP quota
        const user = await prisma.user.findUnique({
            where: { id: authUser!.userId },
            select: {
                rtmpQuota: true,
                _count: {
                    select: { rtmpStreams: true },
                },
            },
        });

        if (!user) {
            return sendError("User not found", 404);
        }

        if (user._count.rtmpStreams >= user.rtmpQuota) {
            return sendError(
                `RTMP quota exceeded. You can only create ${user.rtmpQuota} streams`,
                400
            );
        }

        const streamKey = generateStreamKey();

        const stream = await prisma.rtmpStream.create({
            data: {
                name,
                streamKey,
                rtmpUrl,
                userId: authUser!.userId,
                isActive: true,
                isStreaming: false,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                    },
                },
            },
        });

        // Log creation
        await prisma.streamLog.create({
            data: {
                streamId: stream.id,
                action: "CREATED",
                message: `Stream "${name}" created by ${authUser!.email}`,
            },
        });

        return sendSuccess({ stream }, "RTMP stream created successfully", 201);
    } catch (error) {
        console.error("Create RTMP stream error:", error);
        return sendError("Failed to create RTMP stream", 500);
    }
}
