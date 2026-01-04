import { Buffer } from "node:buffer";
import fs from "node:fs";
import path from "node:path";
import { type NextRequest } from "next/server";
import { getAuthUser, requireAuth } from "@/lib/auth";
import eventEmitter from "@/lib/event-emitter";
import prisma from "@/lib/prisma";
import { sendError, sendSuccess } from "@/lib/response";

export async function GET(request: NextRequest) {
    try {
        const authUser = await getAuthUser(request);
        const authError = requireAuth(authUser);
        if (authError) {
            return authError;
        }

        const query = authUser!.role === "ADMIN" ? {} : { userId: authUser!.userId };

        const videos = await prisma.video.findMany({
            where: query,
            orderBy: {
                uploadedAt: "desc",
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

        return sendSuccess({ videos }, "Videos retrieved successfully");
    } catch (error) {
        console.error("Get videos error:", error);
        return sendError("Failed to retrieve videos", 500);
    }
}

export async function POST(request: NextRequest) {
    try {
        const authUser = await getAuthUser(request);
        const authError = requireAuth(authUser);
        if (authError) {
            return authError;
        }

        const formData = await request.formData();
        const file = formData.get("video") as File | null;

        if (!file) {
            return sendError("No video file provided", 400);
        }

        const allowedTypes = [
            "video/mp4",
            "video/avi",
            "video/mov",
            "video/wmv",
            "video/quicktime",
            "video/x-msvideo",
            "video/x-matroska",
        ];
        if (!allowedTypes.includes(file.type)) {
            return sendError("Invalid file type. Only video files are allowed.", 400);
        }

        const maxSize = Number(globalThis.process.env.MAX_FILE_SIZE) || 2147483648;
        if (file.size > maxSize) {
            return sendError(
                `File too large. Maximum size is ${Math.round(maxSize / 1024 / 1024)}MB.`,
                400,
            );
        }

        const uploadsDir = path.join(globalThis.process.cwd(), "cache", "video");
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const ext = path.extname(file.name);
        const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}${ext}`;
        const filepath = path.join(uploadsDir, filename);

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        fs.writeFileSync(filepath, buffer);

        const video = await prisma.video.create({
            data: {
                filename,
                originalName: file.name,
                path: filepath,
                size: BigInt(file.size),
                duration: null,
                resolution: null,
                format: file.type,
                userId: authUser!.userId,
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

        eventEmitter.emit("video:created", { video });

        return sendSuccess({ video }, "Video uploaded successfully", 201);
    } catch (error) {
        console.error("Upload video error:", error);
        return sendError("Failed to upload video", 500);
    }
}
