import { type NextRequest } from "next/server";
import { getAuthUser, requireAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { sendError, sendSuccess } from "@/lib/response";

interface RouteParams {
    params: Promise<{ id: string }>;
}

// PUT /api/rtmp/[id]/reorder - Reorder videos in stream
export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const authUser = await getAuthUser(request);
        const authError = requireAuth(authUser);
        if (authError) {
            return authError;
        }

        const { id } = await params;
        const body = await request.json();
        const { videoOrders } = body;

        if (!Array.isArray(videoOrders) || videoOrders.length === 0) {
            return sendError("Video orders array is required", 400);
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
                }),
            ),
        );

        // Log reorder
        await prisma.streamLog.create({
            data: {
                streamId: id,
                action: "PLAYLIST_REORDERED",
                message: `Playlist reordered by ${authUser!.email}`,
            },
        });

        return sendSuccess(null, "Video order updated successfully");
    } catch (error) {
        console.error("Reorder videos error:", error);
        return sendError("Failed to reorder videos", 500);
    }
}
