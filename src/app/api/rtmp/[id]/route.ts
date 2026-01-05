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
            return sendError("RTMP stream not found", 404);
        }

        return sendSuccess({ stream }, "RTMP stream retrieved successfully");
    } catch (error) {
        console.error("Get RTMP stream by ID error:", error);
        return sendError("Failed to get RTMP stream", 500);
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
        const { name, rtmpUrl, isActive, playlistMode } = body;

        const where = authUser!.role === "ADMIN" ? { id } : { id, userId: authUser!.userId };

        const stream = await prisma.rtmpStream.findFirst({
            where,
            select: { id: true, name: true, isStreaming: true },
        });

        if (!stream) {
            return sendError("RTMP stream not found", 404);
        }

        if (stream.isStreaming) {
            return sendError("Cannot update stream while it's active", 400);
        }

        const updateData: {
            name?: string;
            rtmpUrl?: string;
            isActive?: boolean;
            playlistMode?: string;
        } = {};

        if (name) {
            updateData.name = name;
        }
        if (rtmpUrl) {
            updateData.rtmpUrl = rtmpUrl;
        }
        if (isActive !== undefined) {
            updateData.isActive = Boolean(isActive);
        }
        if (playlistMode && ["LOOP", "ONCE", "SHUFFLE", "SHUFFLE_LOOP"].includes(playlistMode)) {
            updateData.playlistMode = playlistMode;
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

        await prisma.streamLog.create({
            data: {
                streamId: id,
                action: "UPDATED",
                message: `Stream settings updated by ${authUser!.email}`,
            },
        });

        eventEmitter.emit("stream:updated", { stream: updatedStream });

        return sendSuccess({ stream: updatedStream }, "RTMP stream updated successfully");
    } catch (error) {
        console.error("Update RTMP stream error:", error);
        return sendError("Failed to update RTMP stream", 500);
    }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
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
            select: { id: true, name: true, isStreaming: true },
        });

        if (!stream) {
            return sendError("RTMP stream not found", 404);
        }

        if (stream.isStreaming) {
            return sendError("Cannot delete stream while it's active", 400);
        }

        await prisma.rtmpStream.delete({
            where: { id },
        });

        eventEmitter.emit("stream:deleted", { streamId: id });

        return sendSuccess({ deletedStream: stream }, "RTMP stream deleted successfully");
    } catch (error) {
        console.error("Delete RTMP stream error:", error);
        return sendError("Failed to delete RTMP stream", 500);
    }
}
