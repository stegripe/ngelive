import { type NextRequest } from "next/server";
import { getAuthUser, requireAuth } from "@/lib/auth";
import eventEmitter from "@/lib/event-emitter";
import prisma from "@/lib/prisma";
import { sendError, sendSuccess } from "@/lib/response";

export const dynamic = "force-dynamic";

interface RouteParams {
    params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const authUser = await getAuthUser(request);
        const authError = requireAuth(authUser);
        if (authError) {
            return authError;
        }

        const { id } = await params;
        const where = authUser!.role === "ADMIN" ? { id } : { id, userId: authUser!.userId };

        const stream = await prisma.rtmpStream.findFirst({
            where,
            include: {
                streamVideos: {
                    include: {
                        video: {
                            select: {
                                id: true,
                                filename: true,
                                originalName: true,
                                size: true,
                                duration: true,
                                user: {
                                    select: {
                                        id: true,
                                        username: true,
                                    },
                                },
                            },
                        },
                    },
                    orderBy: { order: "asc" },
                },
            },
        });

        if (!stream) {
            return sendError("RTMP stream not found", 404);
        }

        return sendSuccess({ videos: stream.streamVideos }, "Stream videos retrieved successfully");
    } catch (error) {
        console.error("Get stream videos error:", error);
        return sendError("Failed to get stream videos", 500);
    }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const authUser = await getAuthUser(request);
        const authError = requireAuth(authUser);
        if (authError) {
            return authError;
        }

        const { id } = await params;
        const body = await request.json();
        const { videoId } = body;

        if (!videoId) {
            return sendError("Video ID is required", 400);
        }

        const where = authUser!.role === "ADMIN" ? { id } : { id, userId: authUser!.userId };

        const stream = await prisma.rtmpStream.findFirst({
            where,
            select: { id: true, isStreaming: true },
        });

        if (!stream) {
            return sendError("RTMP stream not found", 404);
        }

        if (stream.isStreaming) {
            return sendError("Cannot modify playlist while stream is active", 400);
        }

        const videoWhere =
            authUser!.role === "ADMIN"
                ? { id: videoId }
                : { id: videoId, userId: authUser!.userId };

        const video = await prisma.video.findFirst({
            where: videoWhere,
            select: { id: true, filename: true, originalName: true, size: true },
        });

        if (!video) {
            return sendError("Video not found or not accessible", 404);
        }

        const existingStreamVideo = await prisma.streamVideo.findFirst({
            where: { streamId: id, videoId },
        });

        if (existingStreamVideo) {
            return sendError("Video already in stream", 400);
        }

        const maxOrder = await prisma.streamVideo.findFirst({
            where: { streamId: id },
            orderBy: { order: "desc" },
            select: { order: true },
        });

        const streamVideo = await prisma.streamVideo.create({
            data: {
                streamId: id,
                videoId,
                order: (maxOrder?.order || 0) + 1,
            },
            include: {
                video: {
                    select: {
                        id: true,
                        filename: true,
                        originalName: true,
                        size: true,
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
        });

        await prisma.streamLog.create({
            data: {
                streamId: id,
                action: "VIDEO_ADDED",
                message: `Video "${video.originalName}" added to stream by ${authUser!.email}`,
            },
        });

        eventEmitter.emit("video:added_to_stream", { streamId: id, streamVideo });

        return sendSuccess({ streamVideo }, "Video added to stream successfully", 201);
    } catch (error) {
        console.error("Add video to stream error:", error);
        return sendError("Failed to add video to stream", 500);
    }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const authUser = await getAuthUser(request);
        const authError = requireAuth(authUser);
        if (authError) {
            return authError;
        }

        const { id } = await params;
        const body = await request.json();
        const { videoIds } = body;

        if (!Array.isArray(videoIds) || videoIds.length === 0) {
            return sendError("Video IDs array is required", 400);
        }

        const where = authUser!.role === "ADMIN" ? { id } : { id, userId: authUser!.userId };

        const stream = await prisma.rtmpStream.findFirst({
            where,
            select: { id: true, isStreaming: true },
        });

        if (!stream) {
            return sendError("RTMP stream not found", 404);
        }

        if (stream.isStreaming) {
            return sendError("Cannot modify playlist while stream is active", 400);
        }

        const videoWhere =
            authUser!.role === "ADMIN"
                ? { id: { in: videoIds } }
                : { id: { in: videoIds }, userId: authUser!.userId };

        const videos = await prisma.video.findMany({
            where: videoWhere,
            select: { id: true, filename: true },
        });

        if (videos.length !== videoIds.length) {
            return sendError("Some videos not found or not accessible", 404);
        }

        await prisma.streamVideo.deleteMany({
            where: { streamId: id },
        });

        const streamVideos = videoIds.map((vid: string, index: number) => ({
            streamId: id,
            videoId: vid,
            order: index + 1,
        }));

        await prisma.streamVideo.createMany({
            data: streamVideos,
        });

        await prisma.streamLog.create({
            data: {
                streamId: id,
                action: "PLAYLIST_UPDATED",
                message: `Playlist updated with ${videoIds.length} videos by ${authUser!.email}`,
            },
        });

        return sendSuccess(
            { assignedVideos: videos.length },
            "Videos assigned to stream successfully",
        );
    } catch (error) {
        console.error("Assign videos to stream error:", error);
        return sendError("Failed to assign videos to stream", 500);
    }
}
