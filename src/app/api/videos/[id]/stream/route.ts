import { Buffer } from "node:buffer";
import fs from "node:fs";
import path from "node:path";
import { type NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET /api/videos/[id]/stream - Stream video
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;

        const video = await prisma.video.findUnique({
            where: { id },
        });

        if (!video) {
            return NextResponse.json({ error: "Video not found" }, { status: 404 });
        }

        const videoPath = path.resolve(video.path);
        if (!fs.existsSync(videoPath)) {
            return NextResponse.json({ error: "Video file not found" }, { status: 404 });
        }

        const stat = fs.statSync(videoPath);
        const fileSize = stat.size;
        const range = request.headers.get("range");

        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = Number.parseInt(parts[0], 10);
            const end = parts[1] ? Number.parseInt(parts[1], 10) : fileSize - 1;
            const chunkSize = end - start + 1;

            const stream = fs.createReadStream(videoPath, { start, end });
            const chunks: Buffer[] = [];

            for await (const chunk of stream) {
                chunks.push(chunk as Buffer);
            }

            const buffer = Buffer.concat(chunks);

            return new NextResponse(buffer, {
                status: 206,
                headers: {
                    "Content-Range": `bytes ${start}-${end}/${fileSize}`,
                    "Accept-Ranges": "bytes",
                    "Content-Length": chunkSize.toString(),
                    "Content-Type": "video/mp4",
                },
            });
        }
        const buffer = fs.readFileSync(videoPath);

        return new NextResponse(buffer, {
            status: 200,
            headers: {
                "Content-Length": fileSize.toString(),
                "Content-Type": "video/mp4",
            },
        });
    } catch (error) {
        console.error("Stream video error:", error);
        return NextResponse.json({ error: "Failed to stream video" }, { status: 500 });
    }
}
