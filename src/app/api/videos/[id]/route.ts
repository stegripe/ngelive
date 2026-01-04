import fs from "node:fs";
import { type NextRequest } from "next/server";
import { getAuthUser, requireAuth } from "@/lib/auth";
import eventEmitter from "@/lib/event-emitter";
import prisma from "@/lib/prisma";
import { sendError, sendSuccess } from "@/lib/response";

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

        const video = await prisma.video.findUnique({
            where: { id },
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

        if (!video) {
            return sendError("Video not found", 404);
        }

        if (authUser!.role !== "ADMIN" && video.userId !== authUser!.userId) {
            return sendError("Unauthorized to access this video", 403);
        }

        return sendSuccess({ video }, "Video retrieved successfully");
    } catch (error) {
        console.error("Get video error:", error);
        return sendError("Failed to retrieve video", 500);
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

        const video = await prisma.video.findUnique({
            where: { id },
        });

        if (!video) {
            return sendError("Video not found", 404);
        }

        if (video.userId !== authUser!.userId && authUser!.role !== "ADMIN") {
            return sendError("Unauthorized to delete this video", 403);
        }

        try {
            if (fs.existsSync(video.path)) {
                fs.unlinkSync(video.path);
            }
        } catch (fileError) {
            console.error("Error deleting file:", fileError);
        }

        await prisma.video.delete({
            where: { id },
        });

        eventEmitter.emit("video:deleted", { videoId: id });

        return sendSuccess(null, "Video deleted successfully");
    } catch (error) {
        console.error("Delete video error:", error);
        return sendError("Failed to delete video", 500);
    }
}
