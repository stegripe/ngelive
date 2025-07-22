import { type ChildProcess, spawn } from "node:child_process";
import prisma from "../config/database";

// Store running FFmpeg processes
const runningStreams: Map<string, ChildProcess> = new Map();

export const startFFmpegStream = async (stream: Stream): Promise<boolean> => {
    try {
        if (runningStreams.has(stream.id)) {
            console.info(`Stream ${stream.id} is already running`);
            return false;
        }

        const videoFiles = stream.streamVideos.map((sv: StreamVideo) => sv.video.path);

        if (videoFiles.length === 0) {
            console.info(`No videos found for stream ${stream.id}`);
            return false;
        }

        const stopRequested = false;

        // Loop forever (mode LOOP), else run once (mode ONCE)
        const loopForever = stream.playlistMode === "LOOP";
        const runLoop = async () => {
            do {
                for (const file of videoFiles) {
                    if (stopRequested) break;

                    const ffmpegArgs = [
                        "-re",
                        "-i",
                        file,
                        "-vf",
                        "scale=1920:1080",
                        "-c:v",
                        "libx264",
                        "-preset",
                        "veryfast",
                        "-tune",
                        "zerolatency",
                        "-b:v",
                        "4500k",
                        "-maxrate",
                        "5000k",
                        "-bufsize",
                        "7000k",
                        "-pix_fmt",
                        "yuv420p",
                        "-g",
                        "60",
                        "-c:a",
                        "aac",
                        "-b:a",
                        "128k",
                        "-ar",
                        "44100",
                        "-threads",
                        "2",
                        "-x264-params",
                        "keyint=60:scenecut=0",
                        "-max_muxing_queue_size",
                        "1024",
                        "-rtmp_buffer",
                        "4096",
                        "-f",
                        "flv",
                        stream.rtmpUrl,
                    ];

                    const ffmpeg = spawn("ffmpeg", ffmpegArgs);
                    runningStreams.set(stream.id, ffmpeg);

                    ffmpeg.stdout.on("data", (data) => {
                        console.info(`FFmpeg stdout: ${data}`);
                    });

                    ffmpeg.stderr.on("data", (data) => {
                        console.error(`FFmpeg stderr: ${data}`);
                    });

                    await new Promise<void>((resolve) => {
                        ffmpeg.on("close", (code) => {
                            console.error(
                                `FFmpeg process for stream ${stream.id} exited with code ${code}`
                            );
                            runningStreams.delete(stream.id);
                            setTimeout(resolve, 2000); // 2s delay before next video (like timeout /t 2)
                        });

                        ffmpeg.on("error", (error) => {
                            console.error(`FFmpeg error for stream ${stream.id}:`, error);
                            runningStreams.delete(stream.id);
                            resolve();
                        });
                    });

                    if (stopRequested) break;
                }
            } while (loopForever && !stopRequested);

            await prisma.rtmpStream.update({
                where: { id: stream.id },
                data: {
                    isStreaming: false,
                    currentVideo: null,
                },
            });

            // Log stop
            await prisma.streamLog.create({
                data: {
                    streamId: stream.id,
                    action: "STOPPED",
                    message: "Stream stopped automatically (FFmpeg loop end/stop)",
                },
            });
        };

        // Start main loop (async)
        runLoop();

        return true;
    } catch (error) {
        console.error("Error starting FFmpeg stream:", error);
        return false;
    }
};

export const stopFFmpegStream = async (streamId: string): Promise<void> => {
    const ffmpeg = runningStreams.get(streamId);

    if (ffmpeg) {
        ffmpeg.kill("SIGTERM");
        runningStreams.delete(streamId);
    }
};

export const getRunningStreams = (): string[] => {
    return Array.from(runningStreams.keys());
};

interface Stream {
    id: string;
    streamVideos: StreamVideo[];
    playlistMode: string;
    rtmpUrl: string;
}

interface StreamVideo {
    video: { path: string };
}
