import { type ChildProcess, execSync, spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import nodeProcess from "node:process";
import { setInterval, setTimeout } from "node:timers";
import prisma from "./prisma";
import { startVideoMonitor } from "./video-monitor";

const FFMPEG_VERBOSE = nodeProcess.env.FFMPEG_VERBOSE === "true";

interface StreamState {
    process: ChildProcess | null;
    startTime: Date;
    videoIndex: number;
    videoPaths: string[];
    rtmpUrl: string;
    playlistMode: string;
    isRunning: boolean;
    retryCount: number;
    lastError?: string;
    lastActivityTime: number;
}

const runningStreams: Map<string, StreamState> = new Map();
const manuallyStoppingStreams: Set<string> = new Set();
const MAX_RETRY_ATTEMPTS = 10;

interface QualityPreset {
    resolution: string;
    videoBitrate: string;
    maxrate: string;
    bufsize: string;
    preset: string;
    audioBitrate: string;
    audioSampleRate: string;
    gopSize: number;
}

type QualityLevel = "ultralow" | "low" | "medium" | "high";

const QUALITY_PRESETS: Record<QualityLevel, QualityPreset> = {
    ultralow: {
        resolution: "854:480",
        videoBitrate: "1000k",
        maxrate: "1500k",
        bufsize: "2000k",
        preset: "ultrafast",
        audioBitrate: "96k",
        audioSampleRate: "44100",
        gopSize: 60,
    },
    low: {
        resolution: "1280:720",
        videoBitrate: "2500k",
        maxrate: "3000k",
        bufsize: "5000k",
        preset: "superfast",
        audioBitrate: "128k",
        audioSampleRate: "44100",
        gopSize: 60,
    },
    medium: {
        resolution: "1920:1080",
        videoBitrate: "4000k",
        maxrate: "5000k",
        bufsize: "8000k",
        preset: "superfast",
        audioBitrate: "128k",
        audioSampleRate: "44100",
        gopSize: 120,
    },
    high: {
        resolution: "1920:1080",
        videoBitrate: "5000k",
        maxrate: "6000k",
        bufsize: "10000k",
        preset: "superfast",
        audioBitrate: "128k",
        audioSampleRate: "44100",
        gopSize: 120,
    },
};

const CONFIG = {
    MAX_CONCURRENT_STREAMS: 50,
    CURRENT_QUALITY: "high" as QualityLevel,
};

const getQualityPreset = (): QualityPreset => QUALITY_PRESETS[CONFIG.CURRENT_QUALITY];

export interface FFmpegStream {
    id: string;
    streamVideos: FFmpegStreamVideo[];
    playlistMode: string;
    rtmpUrl: string;
}

export interface FFmpegStreamVideo {
    video: { path: string; filename: string };
}

const checkFFmpegAvailable = (): boolean => {
    try {
        execSync("ffmpeg -version", { stdio: "ignore" });
        return true;
    } catch {
        return false;
    }
};

const getAvailableMemoryMB = (): number => {
    try {
        const freeBytes = os.freemem();
        return Math.floor(freeBytes / 1024 / 1024);
    } catch {
        return 512;
    }
};

const buildFFmpegArgsForVideo = (videoPath: string, rtmpUrl: string): string[] => {
    const preset = getQualityPreset();

    return [
        "-re",
        "-i",
        videoPath,
        "-vf",
        `scale=${preset.resolution}`,
        "-c:v",
        "libx264",
        "-preset",
        preset.preset,
        "-tune",
        "zerolatency",
        "-b:v",
        preset.videoBitrate,
        "-maxrate",
        preset.maxrate,
        "-bufsize",
        preset.bufsize,
        "-pix_fmt",
        "yuv420p",
        "-g",
        preset.gopSize.toString(),
        "-c:a",
        "aac",
        "-b:a",
        preset.audioBitrate,
        "-ar",
        preset.audioSampleRate,
        "-f",
        "flv",
        rtmpUrl,
    ];
};

async function updateStreamStatusInDB(streamId: string, isStreaming: boolean): Promise<void> {
    try {
        await prisma.rtmpStream.update({
            where: { id: streamId },
            data: { isStreaming, currentVideo: null },
        });
    } catch (e) {
        console.error("[FFmpeg] Error updating stream status in DB:", e);
    }
}

function streamSingleVideo(streamId: string): void {
    const state = runningStreams.get(streamId);
    if (!state || !state.isRunning) {
        return;
    }

    state.lastActivityTime = Date.now();

    if (manuallyStoppingStreams.has(streamId)) {
        if (FFMPEG_VERBOSE) {
            console.log(`[FFmpeg] Stream ${streamId} was manually stopped`);
        }
        manuallyStoppingStreams.delete(streamId);
        runningStreams.delete(streamId);
        return;
    }

    const videoPath = state.videoPaths[state.videoIndex];
    const videoFilename = videoPath.split(/[/\\]/).pop() || videoPath;

    if (state.videoIndex === 0 || FFMPEG_VERBOSE) {
        console.log(`[FFmpeg] Stream ${streamId} - Playing: ${videoFilename}`);
    }

    const ffmpegArgs = buildFFmpegArgsForVideo(videoPath, state.rtmpUrl);

    if (FFMPEG_VERBOSE) {
        console.log(`[FFmpeg] Command: ffmpeg ${ffmpegArgs.join(" ")}`);
    }

    const ffmpegProcess = spawn("ffmpeg", ffmpegArgs, {
        detached: false,
        stdio: ["ignore", "pipe", "pipe"],
    });

    state.process = ffmpegProcess;

    ffmpegProcess.stderr?.on("data", (data) => {
        const message = data.toString().trim();
        if (message && FFMPEG_VERBOSE && (message.includes("Error") || message.includes("error"))) {
            console.error(`[FFmpeg ${streamId}] ${message}`);
        }
    });

    ffmpegProcess.on("exit", (code, _signal) => {
        const currentState = runningStreams.get(streamId);

        if (manuallyStoppingStreams.has(streamId)) {
            if (FFMPEG_VERBOSE) {
                console.log(`[FFmpeg] Stream ${streamId} was manually stopped`);
            }
            manuallyStoppingStreams.delete(streamId);
            runningStreams.delete(streamId);
            updateStreamStatusInDB(streamId, false);
            return;
        }

        if (!currentState || !currentState.isRunning) {
            return;
        }

        if (code === 0) {
            if (FFMPEG_VERBOSE) {
                console.log(`[FFmpeg] Stream ${streamId} - Video completed`);
            }
            currentState.retryCount = 0;
            currentState.lastActivityTime = Date.now();

            currentState.videoIndex++;

            if (currentState.videoIndex >= currentState.videoPaths.length) {
                const shouldLoop =
                    currentState.playlistMode === "LOOP" ||
                    currentState.playlistMode === "SHUFFLE_LOOP";

                if (shouldLoop) {
                    currentState.videoIndex = 0;

                    if (currentState.playlistMode === "SHUFFLE_LOOP") {
                        currentState.videoPaths = [...currentState.videoPaths].sort(
                            () => Math.random() - 0.5,
                        );
                    }

                    console.log(`[FFmpeg] Stream ${streamId} - Playlist loop restart`);
                } else {
                    console.log(`[FFmpeg] Stream ${streamId} - Playlist completed, stopping`);
                    currentState.isRunning = false;
                    runningStreams.delete(streamId);
                    updateStreamStatusInDB(streamId, false);
                    return;
                }
            }

            setTimeout(() => {
                streamSingleVideo(streamId);
            }, 500);
        } else {
            if (currentState.retryCount === 0) {
                console.error(`[FFmpeg] Stream ${streamId} - Error: code=${code}, retrying...`);
            }
            currentState.retryCount++;

            if (currentState.retryCount >= MAX_RETRY_ATTEMPTS) {
                console.error(`[FFmpeg] Stream ${streamId} - Max retries reached, stopping`);
                currentState.isRunning = false;
                runningStreams.delete(streamId);
                updateStreamStatusInDB(streamId, false);
                return;
            }

            const backoffMs = Math.min(2000 * 2 ** (currentState.retryCount - 1), 60000);
            if (FFMPEG_VERBOSE) {
                console.log(`[FFmpeg] Stream ${streamId} - Retrying in ${backoffMs / 1000}s`);
            }

            setTimeout(() => {
                streamSingleVideo(streamId);
            }, backoffMs);
        }
    });

    ffmpegProcess.on("error", (err) => {
        if (FFMPEG_VERBOSE) {
            console.error(`[FFmpeg] Stream ${streamId} - Process error:`, err.message);
        }

        const currentState = runningStreams.get(streamId);
        if (currentState) {
            currentState.retryCount++;

            if (currentState.retryCount >= MAX_RETRY_ATTEMPTS) {
                currentState.isRunning = false;
                runningStreams.delete(streamId);
                updateStreamStatusInDB(streamId, false);
                return;
            }

            const backoffMs = Math.min(2000 * 2 ** (currentState.retryCount - 1), 60000);
            setTimeout(() => {
                streamSingleVideo(streamId);
            }, backoffMs);
        }
    });
}

export const startFFmpegStream = (stream: FFmpegStream): boolean => {
    try {
        if (runningStreams.has(stream.id)) {
            const existingState = runningStreams.get(stream.id);
            if (existingState?.isRunning) {
                console.info(`[FFmpeg] Stream ${stream.id} is already running`);
                return false;
            }
        }

        if (!checkFFmpegAvailable()) {
            console.error("[FFmpeg] FFmpeg is not installed or not in PATH");
            return false;
        }

        const availableMem = getAvailableMemoryMB();
        if (availableMem < 256) {
            console.warn(`[FFmpeg] Low memory warning: ${availableMem}MB available`);
        }

        let videoPaths = stream.streamVideos.map((sv) => sv.video.path);

        if (videoPaths.length === 0) {
            console.info(`[FFmpeg] No videos found for stream ${stream.id}`);
            return false;
        }

        for (const videoPath of videoPaths) {
            if (!fs.existsSync(videoPath)) {
                console.error(`[FFmpeg] Video file not found: ${videoPath}`);
                return false;
            }
        }

        const shuffleMode =
            stream.playlistMode === "SHUFFLE" || stream.playlistMode === "SHUFFLE_LOOP";
        if (shuffleMode) {
            videoPaths = [...videoPaths].sort(() => Math.random() - 0.5);
        }

        console.log(
            "[FFmpeg] Starting stream " +
                stream.id +
                " with " +
                videoPaths.length +
                " videos, mode: " +
                stream.playlistMode,
        );

        const state: StreamState = {
            process: null,
            startTime: new Date(),
            videoIndex: 0,
            videoPaths,
            rtmpUrl: stream.rtmpUrl,
            playlistMode: stream.playlistMode,
            isRunning: true,
            retryCount: 0,
            lastActivityTime: Date.now(),
        };

        runningStreams.set(stream.id, state);

        streamSingleVideo(stream.id);

        try {
            startVideoMonitor();
        } catch (e) {
            void e;
        }

        return true;
    } catch (error) {
        console.error("[FFmpeg] Error starting stream:", error);
        return false;
    }
};

export const stopFFmpegStream = async (streamId: string): Promise<void> => {
    const state = runningStreams.get(streamId);

    if (FFMPEG_VERBOSE) {
        console.log(`[FFmpeg] Stop request for stream ${streamId}`);
    }

    if (!state) {
        try {
            const stream = await prisma.rtmpStream.findUnique({ where: { id: streamId } });
            if (stream?.isStreaming) {
                if (FFMPEG_VERBOSE) {
                    console.log(`[FFmpeg] Stream ${streamId} not in memory, fixing DB status`);
                }
                await updateStreamStatusInDB(streamId, false);
            }
        } catch (e) {
            console.error("[FFmpeg] Error checking stream status:", e);
        }
        return;
    }

    manuallyStoppingStreams.add(streamId);
    state.isRunning = false;

    if (state.process && typeof state.process.kill === "function") {
        try {
            state.process.kill("SIGTERM");
        } catch (e) {
            console.error("[FFmpeg] Error terminating process:", e);
        }
    }

    runningStreams.delete(streamId);
    await updateStreamStatusInDB(streamId, false);

    console.log(`[FFmpeg] Stream ${streamId} stopped`);
};

export const getRunningStreams = (): string[] => {
    return Array.from(runningStreams.keys()).filter((id) => {
        const state = runningStreams.get(id);
        return state?.isRunning === true;
    });
};

export const getStreamInfo = (streamId: string): StreamState | undefined => {
    return runningStreams.get(streamId);
};

export const getAllStreamsInfo = (): Map<string, StreamState> => {
    return runningStreams;
};

export const setQualityPreset = (preset: QualityLevel): void => {
    CONFIG.CURRENT_QUALITY = preset;
    console.info(`[FFmpeg] Quality preset changed to: ${preset}`);
};

export const getCurrentQuality = (): string => {
    return CONFIG.CURRENT_QUALITY;
};

export const stopAllStreams = async (): Promise<void> => {
    const streamIds = Array.from(runningStreams.keys());
    console.info(`[FFmpeg] Stopping all streams (${streamIds.length} active)`);

    await Promise.all(streamIds.map((id) => stopFFmpegStream(id)));
};

export const getSystemStatus = async () => {
    const activeCount = Array.from(runningStreams.values()).filter((s) => s.isRunning).length;

    let totalStreams = 0;
    try {
        totalStreams = await prisma.rtmpStream.count();
    } catch (e) {
        void e;
    }

    return {
        activeStreams: activeCount,
        maxStreams: totalStreams,
        availableMemoryMB: getAvailableMemoryMB(),
        currentQuality: CONFIG.CURRENT_QUALITY,
        ffmpegAvailable: checkFFmpegAvailable(),
    };
};

export const syncStreamStatuses = async (): Promise<void> => {
    try {
        let changesDetected = false;
        const now = Date.now();
        const ACTIVITY_TIMEOUT_MS = 30000;

        const liveStreams = await prisma.rtmpStream.findMany({
            where: { isStreaming: true },
        });

        for (const stream of liveStreams) {
            const state = runningStreams.get(stream.id);

            const hasRecentActivity = state && now - state.lastActivityTime < ACTIVITY_TIMEOUT_MS;
            const isReallyActive = state?.isRunning === true && hasRecentActivity;

            if (!isReallyActive && state?.isRunning !== true) {
                if (FFMPEG_VERBOSE) {
                    console.log(`[FFmpeg] Fixing inconsistent stream ${stream.id}`);
                }
                await prisma.rtmpStream.update({
                    where: { id: stream.id },
                    data: { isStreaming: false, currentVideo: null },
                });
                changesDetected = true;
            }
        }

        for (const [streamId, state] of runningStreams.entries()) {
            if (!state.isRunning) {
                runningStreams.delete(streamId);
                changesDetected = true;
            }
        }

        if (FFMPEG_VERBOSE || changesDetected) {
            const activeCount = Array.from(runningStreams.values()).filter(
                (s) => s.isRunning,
            ).length;
            console.log(`[FFmpeg] Stream status sync completed. Active streams: ${activeCount}`);
        }
    } catch (error) {
        console.error("[FFmpeg] Error syncing stream statuses:", error);
    }
};

setInterval(syncStreamStatuses, 5 * 60 * 1000);

export async function restorePreviousStreams(): Promise<void> {
    try {
        const streamsToRestore = await prisma.rtmpStream.findMany({
            where: { isStreaming: true },
            include: {
                streamVideos: {
                    include: { video: true },
                    orderBy: { order: "asc" },
                },
            },
        });

        if (streamsToRestore.length === 0) {
            return;
        }

        console.log(
            `[FFmpeg] Restoring ${streamsToRestore.length} streams from previous session...`,
        );

        for (const stream of streamsToRestore) {
            try {
                if (runningStreams.has(stream.id)) {
                    continue;
                }

                if (stream.streamVideos.length === 0) {
                    console.log(`[FFmpeg] Stream ${stream.id} has no videos, marking offline`);
                    await prisma.rtmpStream.update({
                        where: { id: stream.id },
                        data: { isStreaming: false },
                    });
                    continue;
                }

                let allVideosExist = true;
                for (const sv of stream.streamVideos) {
                    if (!sv.video.path || !fs.existsSync(sv.video.path)) {
                        console.log(
                            "[FFmpeg] Stream " +
                                stream.id +
                                " - video file missing: " +
                                sv.video.path,
                        );
                        allVideosExist = false;
                        break;
                    }
                }

                if (!allVideosExist) {
                    await prisma.rtmpStream.update({
                        where: { id: stream.id },
                        data: { isStreaming: false },
                    });
                    continue;
                }

                const playlistMode = stream.playlistMode || "LOOP";

                const success = startFFmpegStream({
                    id: stream.id,
                    streamVideos: stream.streamVideos,
                    playlistMode,
                    rtmpUrl: stream.rtmpUrl,
                });

                if (success) {
                    console.log(`[FFmpeg] Restored stream: ${stream.id}`);
                } else {
                    console.log(`[FFmpeg] Failed to restore stream: ${stream.id}`);
                    await prisma.rtmpStream.update({
                        where: { id: stream.id },
                        data: { isStreaming: false },
                    });
                }

                await new Promise((resolve) => setTimeout(resolve, 1000));
            } catch (error) {
                console.error(`[FFmpeg] Error restoring stream ${stream.id}:`, error);
                try {
                    await prisma.rtmpStream.update({
                        where: { id: stream.id },
                        data: { isStreaming: false },
                    });
                } catch (e) {
                    void e;
                }
            }
        }

        console.log("[FFmpeg] Stream restoration complete");
    } catch (error) {
        console.error("[FFmpeg] Error restoring streams:", error);
    }
}

function cleanupOnExit(): void {
    console.log("[FFmpeg] Cleaning up all streams before exit...");

    for (const [streamId, state] of runningStreams.entries()) {
        if (state.process && typeof state.process.kill === "function") {
            try {
                state.process.kill("SIGKILL");
            } catch (e) {
                void e;
            }
        }
        runningStreams.delete(streamId);
    }

    manuallyStoppingStreams.clear();
}

nodeProcess.on("exit", cleanupOnExit);
nodeProcess.on("SIGINT", () => {
    cleanupOnExit();
    nodeProcess.exit(0);
});
nodeProcess.on("SIGTERM", () => {
    cleanupOnExit();
    nodeProcess.exit(0);
});
nodeProcess.on("SIGHUP", () => {
    cleanupOnExit();
    nodeProcess.exit(0);
});

nodeProcess.on("uncaughtException", (err) => {
    console.error("[FFmpeg] Uncaught exception, cleaning up:", err);
    cleanupOnExit();
    nodeProcess.exit(1);
});
