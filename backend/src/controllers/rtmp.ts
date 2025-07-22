import type { Response } from "express";
import prisma from "../config/database";
import type { AuthRequest } from "../middleware/auth";
import { startFFmpegStream, stopFFmpegStream } from "../services/ffmpeg";
import { generateStreamKey } from "../services/rtmp";
import { sendError, sendSuccess } from "../utils/response";
import { validateRequired } from "../utils/validation";

export const getRtmpStreams = async (req: AuthRequest, res: Response) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        const where = req.user?.role === "ADMIN" ? {} : { userId: req.user?.userId };

        const [streams, total] = await Promise.all([
            prisma.rtmpStream.findMany({
                where,
                skip,
                take: Number(limit),
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

        sendSuccess(
            res,
            {
                streams,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    pages: Math.ceil(total / Number(limit)),
                },
            },
            "RTMP streams retrieved successfully"
        );
    } catch (error) {
        console.error("Get RTMP streams error:", error);
        sendError(res, "Failed to get RTMP streams", 500);
    }
};

export const getRtmpStreamById = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        const where = req.user?.role === "ADMIN" ? { id } : { id, userId: req.user?.userId };

        const stream = await prisma.rtmpStream.findFirst({
            where,
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
                                path: true,
                                size: true,
                                duration: true,
                                resolution: true,
                                format: true,
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
                streamLogs: {
                    take: 50,
                    orderBy: { timestamp: "desc" },
                },
            },
        });

        if (!stream) {
            return sendError(res, "RTMP stream not found", 404);
        }

        sendSuccess(res, { stream }, "RTMP stream retrieved successfully");
    } catch (error) {
        console.error("Get RTMP stream by ID error:", error);
        sendError(res, "Failed to get RTMP stream", 500);
    }
};

export const createRtmpStream = async (req: AuthRequest, res: Response) => {
    try {
        const { name, rtmpUrl } = req.body;

        const validationErrors = validateRequired(req.body, ["name", "rtmpUrl"]);
        if (validationErrors.length > 0) {
            return sendError(res, validationErrors.join(", "), 400);
        }

        // Check user's RTMP quota
        const user = await prisma.user.findUnique({
            where: { id: req.user?.userId },
            select: {
                rtmpQuota: true,
                _count: {
                    select: { rtmpStreams: true },
                },
            },
        });

        if (!user) {
            return sendError(res, "User not found", 404);
        }

        if (user._count.rtmpStreams >= user.rtmpQuota) {
            return sendError(
                res,
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
                userId: req.user?.userId as string,
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
                message: `Stream "${name}" created by ${req.user?.email}`,
            },
        });

        sendSuccess(res, { stream }, "RTMP stream created successfully", 201);
    } catch (error) {
        console.error("Create RTMP stream error:", error);
        sendError(res, "Failed to create RTMP stream", 500);
    }
};

export const updateRtmpStream = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { name, rtmpUrl, isActive, playlistMode } = req.body;

        const where = req.user?.role === "ADMIN" ? { id } : { id, userId: req.user?.userId };

        const stream = await prisma.rtmpStream.findFirst({
            where,
            select: { id: true, name: true, isStreaming: true },
        });

        if (!stream) {
            return sendError(res, "RTMP stream not found", 404);
        }

        if (stream.isStreaming) {
            return sendError(res, "Cannot update stream while it's active", 400);
        }

        const updateData: {
            name?: string;
            rtmpUrl?: string;
            isActive?: boolean;
            playlistMode?: "LOOP" | "ONCE" | "SHUFFLE";
        } = {};

        if (name) updateData.name = name;
        if (rtmpUrl) updateData.rtmpUrl = rtmpUrl;
        if (isActive !== undefined) updateData.isActive = Boolean(isActive);
        if (playlistMode && ["LOOP", "ONCE", "SHUFFLE"].includes(playlistMode)) {
            updateData.playlistMode = playlistMode as "LOOP" | "ONCE" | "SHUFFLE";
        }

        const updatedStream = await prisma.rtmpStream.update({
            where: { id },
            data: updateData,
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

        // Log update
        await prisma.streamLog.create({
            data: {
                streamId: id,
                action: "UPDATED",
                message: `Stream settings updated by ${req.user?.email}`,
            },
        });

        sendSuccess(res, { stream: updatedStream }, "RTMP stream updated successfully");
    } catch (error) {
        console.error("Update RTMP stream error:", error);
        sendError(res, "Failed to update RTMP stream", 500);
    }
};

export const deleteRtmpStream = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        const where = req.user?.role === "ADMIN" ? { id } : { id, userId: req.user?.userId };

        const stream = await prisma.rtmpStream.findFirst({
            where,
            select: { id: true, name: true, isStreaming: true },
        });

        if (!stream) {
            return sendError(res, "RTMP stream not found", 404);
        }

        if (stream.isStreaming) {
            return sendError(res, "Cannot delete stream while it's active", 400);
        }

        await prisma.rtmpStream.delete({
            where: { id },
        });

        sendSuccess(res, { deletedStream: stream }, "RTMP stream deleted successfully");
    } catch (error) {
        console.error("Delete RTMP stream error:", error);
        sendError(res, "Failed to delete RTMP stream", 500);
    }
};

export const startStream = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        const where = req.user?.role === "ADMIN" ? { id } : { id, userId: req.user?.userId };

        const stream = await prisma.rtmpStream.findFirst({
            where,
            include: {
                streamVideos: {
                    include: {
                        video: true,
                    },
                    orderBy: { order: "asc" },
                },
            },
        });

        if (!stream) {
            return sendError(res, "RTMP stream not found", 404);
        }

        if (!stream.playlistMode || !["LOOP", "ONCE", "SHUFFLE"].includes(stream.playlistMode)) {
            stream.playlistMode = "LOOP";
        }

        if (stream.isStreaming) {
            return sendError(res, "Stream is already running", 400);
        }

        // AUTO-AKTIFKAN STREAM JIKA BELUM AKTIF
        if (!stream.isActive) {
            await prisma.rtmpStream.update({
                where: { id },
                data: { isActive: true },
            });
            stream.isActive = true;
        }

        if (stream.streamVideos.length === 0) {
            return sendError(res, "No videos assigned to this stream", 400);
        }

        const fs = require("node:fs");
        for (const sv of stream.streamVideos) {
            if (!sv.video.path || !fs.existsSync(sv.video.path)) {
                return sendError(res, `Video file not found: ${sv.video.path}`, 400);
            }
        }

        // Start FFmpeg process
        const success = await startFFmpegStream(stream);

        if (!success) {
            return sendError(res, "Failed to start stream: FFmpeg error", 500);
        }

        // Update stream status
        await prisma.rtmpStream.update({
            where: { id },
            data: {
                isStreaming: true,
                currentVideo: stream.streamVideos[0].video.filename,
            },
        });

        // Log start
        await prisma.streamLog.create({
            data: {
                streamId: id,
                action: "STARTED",
                message: `Stream started by ${req.user?.email}`,
            },
        });

        sendSuccess(res, { message: "Stream started successfully" }, "Stream started");
    } catch (error) {
        console.error("Start stream error:", error);
        sendError(res, "Failed to start stream", 500);
    }
};

export const stopStream = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        const where = req.user?.role === "ADMIN" ? { id } : { id, userId: req.user?.userId };

        const stream = await prisma.rtmpStream.findFirst({
            where,
            select: { id: true, name: true, isStreaming: true },
        });

        if (!stream) {
            return sendError(res, "RTMP stream not found", 404);
        }

        if (!stream.isStreaming) {
            return sendError(res, "Stream is not running", 400);
        }

        // Stop FFmpeg process
        await stopFFmpegStream(id);

        // Update stream status
        await prisma.rtmpStream.update({
            where: { id },
            data: {
                isStreaming: false,
                currentVideo: null,
            },
        });

        // Log stop
        await prisma.streamLog.create({
            data: {
                streamId: id,
                action: "STOPPED",
                message: `Stream stopped by ${req.user?.email}`,
            },
        });

        sendSuccess(res, { message: "Stream stopped successfully" }, "Stream stopped");
    } catch (error) {
        console.error("Stop stream error:", error);
        sendError(res, "Failed to stop stream", 500);
    }
};

export const assignVideosToStream = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { videoIds } = req.body;

        if (!Array.isArray(videoIds) || videoIds.length === 0) {
            return sendError(res, "Video IDs array is required", 400);
        }

        const where = req.user?.role === "ADMIN" ? { id } : { id, userId: req.user?.userId };

        const stream = await prisma.rtmpStream.findFirst({
            where,
            select: { id: true, isStreaming: true },
        });

        if (!stream) {
            return sendError(res, "RTMP stream not found", 404);
        }

        if (stream.isStreaming) {
            return sendError(res, "Cannot modify playlist while stream is active", 400);
        }

        // Verify all videos exist and belong to user (if not admin)
        const videoWhere =
            req.user?.role === "ADMIN"
                ? { id: { in: videoIds } }
                : { id: { in: videoIds }, userId: req.user?.userId };

        const videos = await prisma.video.findMany({
            where: videoWhere,
            select: { id: true, filename: true },
        });

        if (videos.length !== videoIds.length) {
            return sendError(res, "Some videos not found or not accessible", 404);
        }

        // Remove existing assignments
        await prisma.streamVideo.deleteMany({
            where: { streamId: id },
        });

        // Create new assignments
        const streamVideos = videoIds.map((videoId: string, index: number) => ({
            streamId: id,
            videoId,
            order: index + 1,
        }));

        await prisma.streamVideo.createMany({
            data: streamVideos,
        });

        // Log assignment
        await prisma.streamLog.create({
            data: {
                streamId: id,
                action: "PLAYLIST_UPDATED",
                message: `Playlist updated with ${videoIds.length} videos by ${req.user?.email}`,
            },
        });

        sendSuccess(
            res,
            { assignedVideos: videos.length },
            "Videos assigned to stream successfully"
        );
    } catch (error) {
        console.error("Assign videos to stream error:", error);
        sendError(res, "Failed to assign videos to stream", 500);
    }
};

// NEW: Add single video to stream
export const addVideoToStream = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { videoId } = req.body;

        if (!videoId) {
            return sendError(res, "Video ID is required", 400);
        }

        const where = req.user?.role === "ADMIN" ? { id } : { id, userId: req.user?.userId };

        const stream = await prisma.rtmpStream.findFirst({
            where,
            select: { id: true, isStreaming: true },
        });

        if (!stream) {
            return sendError(res, "RTMP stream not found", 404);
        }

        if (stream.isStreaming) {
            return sendError(res, "Cannot modify playlist while stream is active", 400);
        }

        // Verify video exists and is accessible
        const videoWhere =
            req.user?.role === "ADMIN"
                ? { id: videoId }
                : { id: videoId, userId: req.user?.userId };

        const video = await prisma.video.findFirst({
            where: videoWhere,
            select: { id: true, filename: true, originalName: true, size: true },
        });

        if (!video) {
            return sendError(res, "Video not found or not accessible", 404);
        }

        // Check if video already in stream
        const existingStreamVideo = await prisma.streamVideo.findFirst({
            where: { streamId: id, videoId },
        });

        if (existingStreamVideo) {
            return sendError(res, "Video already in stream", 400);
        }

        // Get the current max order
        const maxOrder = await prisma.streamVideo.findFirst({
            where: { streamId: id },
            orderBy: { order: "desc" },
            select: { order: true },
        });

        // Create stream video
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

        // Log addition
        await prisma.streamLog.create({
            data: {
                streamId: id,
                action: "VIDEO_ADDED",
                message: `Video "${video.originalName}" added to stream by ${req.user?.email}`,
            },
        });

        sendSuccess(res, { streamVideo }, "Video added to stream successfully", 201);
    } catch (error) {
        console.error("Add video to stream error:", error);
        sendError(res, "Failed to add video to stream", 500);
    }
};

// NEW: Remove video from stream
export const removeVideoFromStream = async (req: AuthRequest, res: Response) => {
    try {
        const { id, videoId } = req.params;

        const where = req.user?.role === "ADMIN" ? { id } : { id, userId: req.user?.userId };

        const stream = await prisma.rtmpStream.findFirst({
            where,
            select: { id: true, isStreaming: true },
        });

        if (!stream) {
            return sendError(res, "RTMP stream not found", 404);
        }

        if (stream.isStreaming) {
            return sendError(res, "Cannot modify playlist while stream is active", 400);
        }

        // Find and delete the stream video
        const streamVideo = await prisma.streamVideo.findFirst({
            where: { id: videoId, streamId: id },
            include: {
                video: {
                    select: { originalName: true },
                },
            },
        });

        if (!streamVideo) {
            return sendError(res, "Video not found in stream", 404);
        }

        await prisma.streamVideo.delete({
            where: { id: videoId },
        });

        // Log removal
        await prisma.streamLog.create({
            data: {
                streamId: id,
                action: "VIDEO_REMOVED",
                message: `Video "${streamVideo.video.originalName}" removed from stream by ${req.user?.email}`,
            },
        });

        sendSuccess(res, null, "Video removed from stream successfully");
    } catch (error) {
        console.error("Remove video from stream error:", error);
        sendError(res, "Failed to remove video from stream", 500);
    }
};

// NEW: Reorder videos in stream
export const reorderStreamVideos = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { videoOrders } = req.body;

        if (!Array.isArray(videoOrders) || videoOrders.length === 0) {
            return sendError(res, "Video orders array is required", 400);
        }

        const where = req.user?.role === "ADMIN" ? { id } : { id, userId: req.user?.userId };

        const stream = await prisma.rtmpStream.findFirst({
            where,
            select: { id: true, isStreaming: true },
        });

        if (!stream) {
            return sendError(res, "RTMP stream not found", 404);
        }

        if (stream.isStreaming) {
            return sendError(res, "Cannot modify playlist while stream is active", 400);
        }

        // Update orders in transaction
        interface VideoOrder {
            id: string;
            order: number;
        }
        await prisma.$transaction(
            (videoOrders as VideoOrder[]).map((item: VideoOrder) =>
                prisma.streamVideo.update({
                    where: { id: item.id },
                    data: { order: item.order },
                })
            )
        );

        // Log reorder
        await prisma.streamLog.create({
            data: {
                streamId: id,
                action: "PLAYLIST_REORDERED",
                message: `Playlist reordered by ${req.user?.email}`,
            },
        });

        sendSuccess(res, null, "Video order updated successfully");
    } catch (error) {
        console.error("Reorder videos error:", error);
        sendError(res, "Failed to reorder videos", 500);
    }
};
