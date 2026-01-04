import { type NextRequest } from "next/server";
import { getAuthUser, requireAuth } from "@/lib/auth";
import { broadcastEvent } from "@/lib/events";
import prisma from "@/lib/prisma";
import { sendError, sendSuccess } from "@/lib/response";

interface RouteParams {
    params: Promise<{ id: string; videoId: string }>;
}

// DELETE /api/rtmp/[id]/videos/[videoId] - Remove video from stream
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const authUser = await getAuthUser(request);
        const authError = requireAuth(authUser);
        if (authError) {
            return authError;
        }

        const { id, videoId } = await params;
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
            return sendError("Video not found in stream", 404);
        }

        await prisma.streamVideo.delete({
            where: { id: videoId },
        });

        // Log removal
        await prisma.streamLog.create({
            data: {
                streamId: id,
                action: "VIDEO_REMOVED",
                message: `Video "${streamVideo.video.originalName}" removed from stream by ${authUser!.email}`,
            },
        });

        // Broadcast event to all connected clients
        broadcastEvent("streams");

        return sendSuccess(null, "Video removed from stream successfully");
    } catch (error) {
        console.error("Remove video from stream error:", error);
        return sendError("Failed to remove video from stream", 500);
    }
}
