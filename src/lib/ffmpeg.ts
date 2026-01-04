import { type ChildProcess, execSync, spawn } from "node:child_process";
import os from "node:os";
import nodeProcess from "node:process";
import { clearTimeout, setTimeout } from "node:timers";
import prisma from "./prisma";
import { startVideoMonitor } from "./video-monitor";

const FFMPEG_VERBOSE = nodeProcess.env.FFMPEG_VERBOSE === "true";

interface StreamProcess {
    process: ChildProcess;
    startTime: Date;
    videoIndex: number;
    retryCount: number;
    lastError?: string;
    videosStartedCount?: number;
}

const runningStreams: Map<string, StreamProcess> = new Map();

interface QualityPreset {
    resolution: string;
    videoBitrate: string;
    maxrate: string;
    bufsize: string;
    preset: string;
    audioBitrate: string;
    audioSampleRate: string;
    threads: number;
    crf: string;
}

type QualityLevel = "ultralow" | "low" | "medium" | "high";

const QUALITY_PRESETS: Record<QualityLevel, QualityPreset> = {
    ultralow: {
        resolution: "854x480",
        videoBitrate: "800k",
        maxrate: "1000k",
        bufsize: "1500k",
        preset: "ultrafast",
        audioBitrate: "96k",
        audioSampleRate: "44100",
        threads: 1,
        crf: "28",
    },
    low: {
        resolution: "1280x720",
        videoBitrate: "1500k",
        maxrate: "2000k",
        bufsize: "3000k",
        preset: "superfast",
        audioBitrate: "128k",
        audioSampleRate: "44100",
        threads: 1,
        crf: "25",
    },
    medium: {
        resolution: "1280x720",
        videoBitrate: "2500k",
        maxrate: "3000k",
        bufsize: "4500k",
        preset: "veryfast",
        audioBitrate: "128k",
        audioSampleRate: "44100",
        threads: 2,
        crf: "23",
    },
    high: {
        resolution: "1920x1080",
        videoBitrate: "4500k",
        maxrate: "5000k",
        bufsize: "7000k",
        preset: "fast",
        audioBitrate: "192k",
        audioSampleRate: "48000",
        threads: 4,
        crf: "21",
    },
};

const CONFIG = {
    MAX_CONCURRENT_STREAMS: 2,

    MAX_RETRY_COUNT: 3,
    RETRY_DELAY_MS: 5000,

    FFMPEG_NICE_PRIORITY: 10,

    CURRENT_QUALITY: "low" as QualityLevel,
};

const getQualityPreset = (): QualityPreset => QUALITY_PRESETS[CONFIG.CURRENT_QUALITY];

export interface FFmpegStream {
    id: string;
    streamVideos: FFmpegStreamVideo[];
    playlistMode: string;
    rtmpUrl: string;
    quality?: string;
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

const buildFFmpegArgs = (
    inputFile: string,
    rtmpUrl: string,
    presetParam?: QualityPreset,
): string[] => {
    const preset = presetParam || getQualityPreset();
    const [width, height] = preset.resolution.split("x");

    return [
        "-re",
        "-i",
        inputFile,

        "-vf",
        `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,format=yuv420p`,

        "-c:v",
        "libx264",
        "-preset",
        preset.preset,
        "-tune",
        "zerolatency",
        "-profile:v",
        "baseline",
        "-level",
        "3.1",
        "-crf",
        preset.crf,
        "-b:v",
        preset.videoBitrate,
        "-maxrate",
        preset.maxrate,
        "-bufsize",
        preset.bufsize,

        "-g",
        "120",
        "-keyint_min",
        "60",
        "-sc_threshold",
        "0",

        "-r",
        "30",
        "-fps_mode",
        "cfr",

        "-c:a",
        "aac",
        "-b:a",
        preset.audioBitrate,
        "-ar",
        preset.audioSampleRate,
        "-ac",
        "2",

        "-threads",
        String(preset.threads),
        "-thread_type",
        "slice",

        "-max_muxing_queue_size",
        "512",
        "-fflags",
        "+genpts+igndts",
        "-avoid_negative_ts",
        "make_zero",

        "-rtmp_buffer",
        "2048",
        "-rtmp_live",
        "live",
        "-f",
        "flv",
        rtmpUrl,
    ];
};

const buildFFmpegArgsCopyMode = (inputFile: string, rtmpUrl: string): string[] => {
    return [
        "-re",
        "-i",
        inputFile,
        "-c",
        "copy",
        "-f",
        "flv",
        "-flvflags",
        "no_duration_filesize",
        rtmpUrl,
    ];
};

const canUseCopyMode = (videoPath: string): boolean => {
    try {
        const output = execSync(
            `ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,width,height -of csv=p=0 "${videoPath}"`,
            { encoding: "utf-8" },
        );
        const [codec, width] = output.trim().split(",");

        return codec === "h264" && Number.parseInt(width, 10) <= 1920;
    } catch {
        return false;
    }
};

export const startFFmpegStream = (stream: FFmpegStream): boolean => {
    try {
        if (runningStreams.has(stream.id)) {
            console.info(`[FFmpeg] Stream ${stream.id} is already running`);
            return false;
        }

        if (runningStreams.size >= CONFIG.MAX_CONCURRENT_STREAMS) {
            console.warn(
                `[FFmpeg] Maximum concurrent streams reached (${CONFIG.MAX_CONCURRENT_STREAMS})`,
            );
            return false;
        }

        if (!checkFFmpegAvailable()) {
            console.error("[FFmpeg] FFmpeg is not installed or not in PATH");
            return false;
        }

        const availableMem = getAvailableMemoryMB();
        if (availableMem < 256) {
            console.warn(`[FFmpeg] Low memory warning: ${availableMem}MB available`);
        }

        const videoFiles = stream.streamVideos.map((sv) => ({
            path: sv.video.path,
            filename: sv.video.filename,
        }));

        if (videoFiles.length === 0) {
            console.info(`[FFmpeg] No videos found for stream ${stream.id}`);
            return false;
        }

        const loopForever =
            stream.playlistMode === "LOOP" || stream.playlistMode === "SHUFFLE_LOOP";
        const shuffleMode =
            stream.playlistMode === "SHUFFLE" || stream.playlistMode === "SHUFFLE_LOOP";

        const qualityLevel = (stream as any).quality || CONFIG.CURRENT_QUALITY;
        const getPreset = (level: string) =>
            (QUALITY_PRESETS as Record<string, QualityPreset>)[level] ||
            QUALITY_PRESETS[CONFIG.CURRENT_QUALITY];

        if (shuffleMode) {
            for (let i = videoFiles.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [videoFiles[i], videoFiles[j]] = [videoFiles[j], videoFiles[i]];
            }
        }

        const runLoop = async () => {
            let stopRequested = false;
            let retryCount = 0;

            do {
                for (let videoIndex = 0; videoIndex < videoFiles.length; videoIndex++) {
                    if (stopRequested) {
                        break;
                    }

                    const currentVideo = videoFiles[videoIndex];

                    try {
                        await prisma.rtmpStream.update({
                            where: { id: stream.id },
                            data: { currentVideo: currentVideo.filename },
                        });
                    } catch (e) {
                        console.error(`[FFmpeg] Failed to update current video:`, e);
                    }

                    const useCopyMode = await canUseCopyMode(currentVideo.path);

                    const preset = getPreset(qualityLevel);
                    const ffmpegArgs = useCopyMode
                        ? buildFFmpegArgsCopyMode(currentVideo.path, stream.rtmpUrl)
                        : buildFFmpegArgs(currentVideo.path, stream.rtmpUrl, preset);

                    const existingInfo = runningStreams.get(stream.id);
                    const videosStartedCount = (existingInfo?.videosStartedCount || 0) + 1;

                    const ffmpeg = spawn("ffmpeg", ffmpegArgs, {
                        stdio: ["ignore", "pipe", "pipe"],
                    });

                    runningStreams.set(stream.id, {
                        process: ffmpeg,
                        startTime: new Date(),
                        videoIndex,
                        retryCount,
                        videosStartedCount,
                    });

                    const shouldLogStart =
                        FFMPEG_VERBOSE || !useCopyMode || videosStartedCount % 5 === 1;
                    if (shouldLogStart) {
                        console.info(
                            `[FFmpeg] Starting stream ${stream.id} - Video: ${currentVideo.filename} (Copy mode: ${useCopyMode})`,
                        );
                    }

                    ffmpeg.stdout?.on("data", (_data) => {
                        // Minimal logging to reduce overhead
                    });

                    let lastProgress = "";
                    ffmpeg.stderr?.on("data", (data) => {
                        const output = data.toString();

                        if (output.includes("Error") || output.includes("error")) {
                            console.error(`[FFmpeg ${stream.id}] ${output.trim()}`);
                            const streamInfo = runningStreams.get(stream.id);
                            if (streamInfo) {
                                streamInfo.lastError = output.trim();
                            }
                        }

                        if (output.includes("frame=") && output !== lastProgress) {
                            lastProgress = output;
                            // Uncomment for debug: console.debug(`[FFmpeg ${stream.id}] ${output.trim()}`);
                        }
                    });

                    const exitCode = await new Promise<number | null>((resolve) => {
                        ffmpeg.on("close", (code) => {
                            const info = runningStreams.get(stream.id);
                            if (code !== 0 && code !== null) {
                                console.error(
                                    `[FFmpeg] Stream ${stream.id} video exited with code ${code}`,
                                );
                            } else if (!useCopyMode) {
                                console.info(
                                    `[FFmpeg] Stream ${stream.id} video ended with code ${code}`,
                                );
                            } else if (info && (info.videosStartedCount || 0) % 5 === 0) {
                                console.info(
                                    `[FFmpeg] Stream ${stream.id} progressed (copy-mode) - video #${info.videosStartedCount}`,
                                );
                            }
                            resolve(code);
                        });

                        ffmpeg.on("error", (error) => {
                            console.error(`[FFmpeg] Stream ${stream.id} error:`, error.message);
                            resolve(null);
                        });
                    });

                    if (!runningStreams.has(stream.id)) {
                        stopRequested = true;
                        break;
                    }

                    if (exitCode !== 0 && exitCode !== null) {
                        retryCount++;
                        const streamInfo = runningStreams.get(stream.id);

                        if (retryCount >= CONFIG.MAX_RETRY_COUNT) {
                            console.error(
                                `[FFmpeg] Stream ${stream.id} max retries reached. Stopping.`,
                            );
                            stopRequested = true;

                            await prisma.streamLog.create({
                                data: {
                                    streamId: stream.id,
                                    action: "ERROR",
                                    message: `Stream stopped after ${retryCount} retries. Last error: ${streamInfo?.lastError || "Unknown"}`,
                                },
                            });
                            break;
                        }

                        console.warn(
                            `[FFmpeg] Stream ${stream.id} failed, retry ${retryCount}/${CONFIG.MAX_RETRY_COUNT} in ${CONFIG.RETRY_DELAY_MS}ms`,
                        );
                        await new Promise((r) => setTimeout(r, CONFIG.RETRY_DELAY_MS));
                    } else {
                        retryCount = 0;
                    }

                    if (!stopRequested && videoIndex < videoFiles.length - 1) {
                        await new Promise((r) => setTimeout(r, 1000));
                    }
                }

                if (shuffleMode && loopForever && !stopRequested) {
                    for (let i = videoFiles.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [videoFiles[i], videoFiles[j]] = [videoFiles[j], videoFiles[i]];
                    }
                }
            } while (loopForever && !stopRequested);

            runningStreams.delete(stream.id);

            try {
                await prisma.rtmpStream.update({
                    where: { id: stream.id },
                    data: {
                        isStreaming: false,
                        currentVideo: null,
                    },
                });

                await prisma.streamLog.create({
                    data: {
                        streamId: stream.id,
                        action: "STOPPED",
                        message: "Stream completed/stopped",
                    },
                });
            } catch (e) {
                console.error(`[FFmpeg] Failed to update stream status:`, e);
            }
        };

        try {
            startVideoMonitor();
        } catch (e) {
            void e;
        }

        runLoop().catch((e) => {
            console.error(`[FFmpeg] Stream loop error:`, e);
            runningStreams.delete(stream.id);
        });

        return true;
    } catch (error) {
        console.error("[FFmpeg] Error starting stream:", error);
        return false;
    }
};

export const stopFFmpegStream = async (streamId: string): Promise<void> => {
    const streamInfo = runningStreams.get(streamId);

    if (streamInfo) {
        const { process: ffmpeg } = streamInfo;

        ffmpeg.stdin?.write("q");

        await new Promise<void>((resolve) => {
            const timeout = setTimeout(() => {
                if (!ffmpeg.killed) {
                    console.warn(`[FFmpeg] Force killing stream ${streamId}`);
                    ffmpeg.kill("SIGKILL");
                }
                resolve();
            }, 3000);

            ffmpeg.on("close", () => {
                clearTimeout(timeout);
                resolve();
            });
        });

        runningStreams.delete(streamId);
        console.info(`[FFmpeg] Stream ${streamId} stopped`);
    }
};

export const getRunningStreams = (): string[] => {
    return Array.from(runningStreams.keys());
};

export const getStreamInfo = (streamId: string): StreamProcess | undefined => {
    return runningStreams.get(streamId);
};

export const getAllStreamsInfo = (): Map<string, StreamProcess> => {
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

export const getSystemStatus = () => {
    return {
        activeStreams: runningStreams.size,
        maxStreams: CONFIG.MAX_CONCURRENT_STREAMS,
        availableMemoryMB: getAvailableMemoryMB(),
        currentQuality: CONFIG.CURRENT_QUALITY,
        ffmpegAvailable: checkFFmpegAvailable(),
    };
};
