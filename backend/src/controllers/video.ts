import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import type { Request, Response } from "express";
import type { AuthRequest } from "../middleware/auth";
import { sendError, sendSuccess } from "../utils/response";

const prisma = new PrismaClient();

export const getVideos = async (req: AuthRequest, res: Response) => {
    try {
        const currentUser = req.user;
        if (!currentUser) {
            return sendError(res, "Unauthorized", 401);
        }

        // Build query based on user role
        const query =
            currentUser.role === "ADMIN"
                ? {} // Admin can see all videos
                : { userId: currentUser.userId }; // User only sees their own videos

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

        sendSuccess(res, { videos }, "Videos retrieved successfully");
    } catch (error) {
        console.error("Get videos error:", error);
        sendError(res, "Failed to retrieve videos");
    }
};

export const getVideo = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const currentUser = req.user;
        if (!currentUser) {
            return sendError(res, "Unauthorized", 401);
        }

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
            return sendError(res, "Video not found", 404);
        }

        // Check if user can access this video
        if (currentUser.role !== "ADMIN" && video.userId !== currentUser.userId) {
            return sendError(res, "Unauthorized to access this video", 403);
        }

        sendSuccess(res, { video }, "Video retrieved successfully");
    } catch (error) {
        console.error("Get video error:", error);
        sendError(res, "Failed to retrieve video");
    }
};

export const uploadVideo = async (req: AuthRequest, res: Response) => {
    try {
        console.info("Upload request received");
        console.info("File:", req.file);
        console.info("User:", req.user);

        const file = req.file;
        if (!file) {
            console.info("No file provided");
            return sendError(res, "No video file provided", 400);
        }

        // Fix: Use userId instead of id
        const userId = req.user?.userId;
        if (!userId) {
            return sendError(res, "User ID is missing", 400);
        }

        // Create video record
        const video = await prisma.video.create({
            data: {
                filename: file.filename,
                originalName: file.originalname || "unknown",
                path: file.path,
                size: BigInt(file.size),
                duration: null,
                resolution: null,
                format: file.mimetype || "unknown",
                userId: userId,
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

        console.info("Video uploaded successfully:", video.id);
        sendSuccess(res, { video }, "Video uploaded successfully", 201);
    } catch (error) {
        console.error("Upload video error:", error);
        sendError(res, "Failed to upload video");
    }
};

export const deleteVideo = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const currentUser = req.user;
        if (!currentUser) {
            return sendError(res, "Unauthorized", 401);
        }

        const video = await prisma.video.findUnique({
            where: { id },
        });

        if (!video) {
            return sendError(res, "Video not found", 404);
        }

        // Check permission: owner or admin
        if (video.userId !== currentUser.userId && currentUser.role !== "ADMIN") {
            return sendError(res, "Unauthorized to delete this video", 403);
        }

        // Delete file
        try {
            if (fs.existsSync(video.path)) {
                fs.unlinkSync(video.path);
            }
        } catch (fileError) {
            console.error("Error deleting file:", fileError);
        }

        // Delete from database
        await prisma.video.delete({
            where: { id },
        });

        sendSuccess(res, null, "Video deleted successfully");
    } catch (error) {
        console.error("Delete video error:", error);
        sendError(res, "Failed to delete video");
    }
};

export const streamVideo = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const video = await prisma.video.findUnique({
            where: { id },
        });

        if (!video) {
            return res.status(404).json({ error: "Video not found" });
        }

        const videoPath = path.resolve(video.path);
        if (!fs.existsSync(videoPath)) {
            return res.status(404).json({ error: "Video file not found" });
        }

        const stat = fs.statSync(videoPath);
        const fileSize = stat.size;
        const range = req.headers.range;

        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = Number.parseInt(parts[0], 10);
            const end = parts[1] ? Number.parseInt(parts[1], 10) : fileSize - 1;
            const chunksize = end - start + 1;
            const file = fs.createReadStream(videoPath, { start, end });
            const head = {
                "Content-Range": `bytes ${start}-${end}/${fileSize}`,
                "Accept-Ranges": "bytes",
                "Content-Length": chunksize,
                "Content-Type": "video/mp4",
            };
            res.writeHead(206, head);
            file.pipe(res);
        } else {
            const head = {
                "Content-Length": fileSize,
                "Content-Type": "video/mp4",
            };
            res.writeHead(200, head);
            fs.createReadStream(videoPath).pipe(res);
        }
    } catch (error) {
        console.error("Stream video error:", error);
        res.status(500).json({ error: "Failed to stream video" });
    }
};
