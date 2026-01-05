import { type NextRequest } from "next/server";
import { getAuthUser, requireAuth } from "@/lib/auth";
import eventEmitter from "@/lib/event-emitter";
import { stopFFmpegStream } from "@/lib/ffmpeg";
import prisma from "@/lib/prisma";
import { sendError, sendSuccess } from "@/lib/response";

export const dynamic = "force-dynamic";

interface RouteParams {
    params: Promise<{ id: string }>;
}

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
            select: { id: true, name: true, isStreaming: true },
        });

        if (!stream) {
            return sendError("RTMP stream not found", 404);
        }

        if (!stream.isStreaming) {
            return sendError("Stream is not running", 400);
        }

        await stopFFmpegStream(id);

        await prisma.rtmpStream.update({
            where: { id },
            data: {
                isStreaming: false,
                currentVideo: null,
            },
        });

        await prisma.streamLog.create({
            data: {
                streamId: id,
                action: "STOPPED",
                message: `Stream stopped by ${authUser!.email}`,
            },
        });

        eventEmitter.emit("stream:stopped", { streamId: id });

        return sendSuccess({ message: "Stream stopped successfully" }, "Stream stopped");
    } catch (error) {
        console.error("Stop stream error:", error);
        return sendError("Failed to stop stream", 500);
    }
}
