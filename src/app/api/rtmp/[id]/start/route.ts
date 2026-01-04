import fs from "node:fs";
import { type NextRequest } from "next/server";
import { getAuthUser, requireAuth } from "@/lib/auth";
import eventEmitter from "@/lib/event-emitter";
import { startFFmpegStream } from "@/lib/ffmpeg";
import prisma from "@/lib/prisma";
import { sendError, sendSuccess } from "@/lib/response";

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

interface RouteParams {
    params: Promise<{ id: string }>;
}

// POST /api/rtmp/[id]/start - Start streaming
export async function POST(request: NextRequest, { params }: RouteParams) {
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
                        video: true,
                    },
                    orderBy: { order: "asc" },
                },
            },
        });

        if (!stream) {
            return sendError("RTMP stream not found", 404);
        }

        if (
            !stream.playlistMode ||
            !["LOOP", "ONCE", "SHUFFLE", "SHUFFLE_LOOP"].includes(stream.playlistMode)
        ) {
            stream.playlistMode = "LOOP";
        }

        if (stream.isStreaming) {
            return sendError("Stream is already running", 400);
        }

        // AUTO-ACTIVATE STREAM IF NOT ACTIVE
        if (!stream.isActive) {
            await prisma.rtmpStream.update({
                where: { id },
                data: { isActive: true },
            });
            stream.isActive = true;
        }

        if (stream.streamVideos.length === 0) {
            return sendError("No videos assigned to this stream", 400);
        }

        // Check all video files exist
        for (const sv of stream.streamVideos) {
            if (!sv.video.path || !fs.existsSync(sv.video.path)) {
                return sendError(`Video file not found: ${sv.video.path}`, 400);
            }
        }

        // Start FFmpeg process
        const success = await startFFmpegStream(stream);

        if (!success) {
            return sendError("Failed to start stream: FFmpeg error", 500);
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
                message: `Stream started by ${authUser!.email}`,
            },
        });

        // Emit event for real-time updates
        eventEmitter.emit("stream:started", { streamId: id });

        return sendSuccess({ message: "Stream started successfully" }, "Stream started");
    } catch (error) {
        console.error("Start stream error:", error);
        return sendError("Failed to start stream", 500);
    }
}
