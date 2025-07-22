import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export interface VideoMetadata {
    duration?: number;
    resolution?: string;
    format?: string;
}

export const processVideo = async (filePath: string): Promise<VideoMetadata> => {
    return new Promise((resolve, _reject) => {
        const ffprobe = spawn("ffprobe", [
            "-v",
            "quiet",
            "-print_format",
            "json",
            "-show_format",
            "-show_streams",
            filePath,
        ]);

        let output = "";

        ffprobe.stdout.on("data", (data) => {
            output += data.toString();
        });

        ffprobe.on("close", (code) => {
            if (code !== 0) {
                resolve({});
                return;
            }

            try {
                const metadata = JSON.parse(output);
                interface FFProbeStream {
                    codec_type: string;
                    width?: number;
                    height?: number;
                }
                const videoStream = (metadata.streams as FFProbeStream[]).find(
                    (stream) => stream.codec_type === "video"
                );

                const result: VideoMetadata = {
                    duration: metadata.format.duration
                        ? Math.round(Number(metadata.format.duration))
                        : undefined,
                    resolution: videoStream
                        ? `${videoStream.width}x${videoStream.height}`
                        : undefined,
                    format: path.extname(filePath).substring(1).toUpperCase(),
                };

                resolve(result);
            } catch (_error) {
                resolve({});
            }
        });

        ffprobe.on("error", () => {
            resolve({});
        });
    });
};

export const deleteVideoFile = async (filePath: string): Promise<void> => {
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    } catch (error) {
        console.error("Error deleting video file:", error);
    }
};
