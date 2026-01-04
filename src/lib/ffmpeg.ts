import { type ChildProcess, execSync, spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
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
    userId?: string;
    concatFile?: string;
}

const runningStreams: Map<string, StreamProcess> = new Map();
const manuallyStoppingStreams: Set<string> = new Set();
const startingStreams: Set<string> = new Set(); // Tracks streams in startup phase
const streamRetryCount: Map<string, number> = new Map();
const streamLastSuccessTime: Map<string, number> = new Map();
const MAX_RETRY_ATTEMPTS = 10;
const RETRY_RESET_INTERVAL = 30 * 60 * 1000; // 30 minutes
const STARTUP_GRACE_PERIOD_MS = 15000; // 15 seconds grace period for startup

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
    MAX_CONCURRENT_STREAMS: 50,

    MAX_RETRY_COUNT: 10,
    RETRY_DELAY_MS: 3000,

    FFMPEG_NICE_PRIORITY: 10,

    CURRENT_QUALITY: "low" as QualityLevel,
};

// Helper functions for retry management (from StreamFlow)
function cleanupStreamData(streamId: string) {
    streamRetryCount.delete(streamId);
    streamLastSuccessTime.delete(streamId);
}

function checkAndResetRetryCounter(streamId: string) {
    const lastSuccess = streamLastSuccessTime.get(streamId);
    if (lastSuccess && (Date.now() - lastSuccess) >= RETRY_RESET_INTERVAL) {
        const oldCount = streamRetryCount.get(streamId) || 0;
        if (oldCount > 0) {
            streamRetryCount.set(streamId, 0);
            console.log(`[FFmpeg] Reset retry counter for stream ${streamId} after successful streaming period`);
        }
        streamLastSuccessTime.set(streamId, Date.now());
    }
}

function markStreamSuccess(streamId: string) {
    if (!streamLastSuccessTime.has(streamId)) {
        streamLastSuccessTime.set(streamId, Date.now());
    }
    checkAndResetRetryCounter(streamId);
}

// Ensure temp directory exists
function ensureTempDir(): string {
    const tempDir = path.join(process.cwd(), "cache", "temp");
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }
    return tempDir;
}

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

const buildFFmpegArgs = (
    inputFile: string,
    rtmpUrl: string,
    presetParam?: QualityPreset,
): string[] => {
    const preset = presetParam || getQualityPreset();
    const [width, height] = preset.resolution.split("x");

    return [
        "-nostdin",
        "-loglevel", "warning",
        "-re",
        "-fflags", "+genpts+igndts",
        "-i", inputFile,

        "-vf",
        `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,format=yuv420p`,

        "-c:v", "libx264",
        "-preset", preset.preset,
        "-profile:v", "high",
        "-level", "4.1",
        "-b:v", preset.videoBitrate,
        "-maxrate", preset.maxrate,
        "-bufsize", preset.bufsize,
        "-pix_fmt", "yuv420p",

        "-g", "60",
        "-keyint_min", "60",
        "-sc_threshold", "0",

        "-s", preset.resolution,
        "-r", "30",

        "-c:a", "aac",
        "-b:a", preset.audioBitrate,
        "-ar", preset.audioSampleRate,
        "-ac", "2",

        "-f", "flv",
        rtmpUrl,
    ];
};

// Build FFmpeg args using concat file for playlist (like StreamFlow)
const buildFFmpegArgsConcatMode = (
    concatFile: string,
    rtmpUrl: string,
    useAdvancedSettings: boolean,
    preset?: QualityPreset,
): string[] => {
    // Copy mode - just remux without re-encoding (fast, low CPU)
    // BUT: This can fail if videos have different codecs/timestamps
    if (!useAdvancedSettings) {
        return [
            "-nostdin",
            "-loglevel", "warning",
            "-re",
            "-fflags", "+genpts+igndts+discardcorrupt",
            "-avoid_negative_ts", "make_zero",
            "-f", "concat",
            "-safe", "0",
            "-i", concatFile,
            "-c:v", "copy",
            "-c:a", "aac",
            "-b:a", "128k",
            "-ar", "44100",
            "-f", "flv",
            "-flvflags", "no_duration_filesize",
            rtmpUrl,
        ];
    }

    // Advanced mode - re-encode with quality settings (more stable, like autostream.bat)
    const p = preset || getQualityPreset();
    const gopSize = 120; // 4 seconds at 30fps (like autostream.bat with -g 120)

    return [
        "-nostdin",
        "-loglevel", "warning",
        "-re",
        "-fflags", "+genpts+igndts+discardcorrupt",
        "-avoid_negative_ts", "make_zero",
        "-f", "concat",
        "-safe", "0",
        "-i", concatFile,
        // Video encoding similar to autostream.bat
        "-vf", "scale=1920:1080",
        "-c:v", "libx264",
        "-preset", "superfast",
        "-tune", "zerolatency",
        "-b:v", "5000k",
        "-maxrate", "6000k",
        "-bufsize", "10000k",
        "-pix_fmt", "yuv420p",
        "-g", gopSize.toString(),
        // Audio
        "-c:a", "aac",
        "-b:a", "128k",
        "-ar", "44100",
        "-ac", "2",
        "-f", "flv",
        "-flvflags", "no_duration_filesize",
        rtmpUrl,
    ];
};

const buildFFmpegArgsCopyMode = (inputFile: string, rtmpUrl: string): string[] => {
    return [
        "-nostdin",
        "-loglevel", "warning",
        "-re",
        "-fflags", "+genpts+igndts",
        "-i", inputFile,
        "-c:v", "copy",
        "-c:a", "aac",
        "-b:a", "128k",
        "-ar", "44100",
        "-f", "flv",
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

// Create concat file for playlist (like StreamFlow)
function createConcatFile(streamId: string, videoPaths: string[], loopForever: boolean): string {
    const tempDir = ensureTempDir();
    const concatFile = path.join(tempDir, `playlist_${streamId}.txt`);

    let concatContent = "";
    
    // Escape special characters in file paths
    const escapePath = (p: string): string => {
        return p.replace(/\\/g, "/").replace(/'/g, "'\\''");
    };
    
    if (loopForever) {
        // Repeat the playlist 100 times for "infinite" loop (should last days)
        for (let i = 0; i < 100; i++) {
            for (const videoPath of videoPaths) {
                concatContent += `file '${escapePath(videoPath)}'\n`;
            }
        }
    } else {
        for (const videoPath of videoPaths) {
            concatContent += `file '${escapePath(videoPath)}'\n`;
        }
    }

    fs.writeFileSync(concatFile, concatContent);
    console.log(`[FFmpeg] Created concat file: ${concatFile} with ${videoPaths.length} videos, loop: ${loopForever}`);
    return concatFile;
}

export const startFFmpegStream = (stream: FFmpegStream): boolean => {
    try {
        // Reset retry count on fresh start
        streamRetryCount.set(stream.id, 0);

        if (runningStreams.has(stream.id)) {
            console.info(`[FFmpeg] Stream ${stream.id} is already running`);
            return false;
        }

        if (startingStreams.has(stream.id)) {
            console.info(`[FFmpeg] Stream ${stream.id} is currently starting up`);
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

        // Validate all video files exist
        for (const video of videoFiles) {
            if (!fs.existsSync(video.path)) {
                console.error(`[FFmpeg] Video file not found: ${video.path}`);
                return false;
            }
        }

        const loopForever =
            stream.playlistMode === "LOOP" || stream.playlistMode === "SHUFFLE_LOOP";
        const shuffleMode =
            stream.playlistMode === "SHUFFLE" || stream.playlistMode === "SHUFFLE_LOOP";

        // Shuffle videos if needed
        let videoPaths = videoFiles.map(v => v.path);
        if (shuffleMode) {
            videoPaths = [...videoPaths].sort(() => Math.random() - 0.5);
        }

        // Mark stream as starting (to prevent sync from interfering)
        startingStreams.add(stream.id);

        // Create concat file (like StreamFlow approach)
        const concatFile = createConcatFile(stream.id, videoPaths, loopForever);

        // Build FFmpeg args using concat mode (copy by default for efficiency)
        const ffmpegArgs = buildFFmpegArgsConcatMode(concatFile, stream.rtmpUrl, false);

        const fullCommand = `ffmpeg ${ffmpegArgs.join(" ")}`;
        console.log(`[FFmpeg] Starting stream ${stream.id} with command: ${fullCommand}`);

        // Spawn FFmpeg process
        const ffmpegProcess = spawn("ffmpeg", ffmpegArgs, {
            detached: false,
            stdio: ["ignore", "pipe", "pipe"],
        });

        // Store stream info IMMEDIATELY after spawn
        const startTimeIso = new Date();
        runningStreams.set(stream.id, {
            process: ffmpegProcess,
            startTime: startTimeIso,
            videoIndex: 0,
            retryCount: 0,
            videosStartedCount: 1,
            concatFile,
        });

        streamLastSuccessTime.set(stream.id, Date.now());

        // Remove from starting set after grace period
        setTimeout(() => {
            startingStreams.delete(stream.id);
        }, STARTUP_GRACE_PERIOD_MS);

        // Handle stdout
        ffmpegProcess.stdout?.on("data", (data) => {
            const message = data.toString().trim();
            if (message) {
                markStreamSuccess(stream.id);
            }
        });

        // Handle stderr (FFmpeg logs here)
        ffmpegProcess.stderr?.on("data", (data) => {
            const message = data.toString().trim();
            if (message) {
                if (message.includes("frame=")) {
                    markStreamSuccess(stream.id);
                } else if (message.includes("Error") || message.includes("error")) {
                    console.error(`[FFmpeg ${stream.id}] ${message}`);
                    const streamInfo = runningStreams.get(stream.id);
                    if (streamInfo) {
                        streamInfo.lastError = message;
                    }
                } else if (FFMPEG_VERBOSE) {
                    console.log(`[FFmpeg ${stream.id}] ${message}`);
                }
            }
        });

        // Handle process exit
        ffmpegProcess.on("exit", async (code, signal) => {
            console.log(`[FFmpeg] Stream ${stream.id} ended with code ${code}, signal: ${signal}`);

            // Clean up startup tracking
            startingStreams.delete(stream.id);

            const wasActive = runningStreams.delete(stream.id);
            const isManualStop = manuallyStoppingStreams.has(stream.id);

            // Clean up concat file asynchronously (with retry for Windows EBUSY)
            cleanupConcatFile(concatFile).catch(e => {
                console.error(`[FFmpeg] Error in exit cleanup:`, e);
            });

            // If manually stopped, don't retry
            if (isManualStop) {
                console.log(`[FFmpeg] Stream ${stream.id} was manually stopped, not restarting`);
                manuallyStoppingStreams.delete(stream.id);
                cleanupStreamData(stream.id);

                if (wasActive) {
                    try {
                        await prisma.rtmpStream.update({
                            where: { id: stream.id },
                            data: { isStreaming: false, currentVideo: null },
                        });
                        await prisma.streamLog.create({
                            data: {
                                streamId: stream.id,
                                action: "STOPPED",
                                message: "Stream stopped manually",
                            },
                        });
                    } catch (e) {
                        console.error(`[FFmpeg] Error updating stream status:`, e);
                    }
                }
                return;
            }

            // Check if we should retry
            const shouldRetry = signal === "SIGSEGV" || signal === "SIGKILL" || (code !== 0 && code !== null);

            if (shouldRetry) {
                const retryCount = streamRetryCount.get(stream.id) || 0;

                if (retryCount < MAX_RETRY_ATTEMPTS) {
                    streamRetryCount.set(stream.id, retryCount + 1);

                    // Exponential backoff: 3s, 6s, 12s, 24s... max 60s
                    const backoffMs = Math.min(3000 * Math.pow(2, retryCount), 60000);

                    console.log(`[FFmpeg] Stream ${stream.id} interrupted. Attempting restart #${retryCount + 1} in ${backoffMs / 1000}s`);

                    setTimeout(async () => {
                        try {
                            // Check if stream still exists and should be live
                            const streamInfo = await prisma.rtmpStream.findUnique({
                                where: { id: stream.id },
                                include: {
                                    streamVideos: {
                                        include: { video: true },
                                        orderBy: { order: "asc" },
                                    },
                                },
                            });

                            if (streamInfo && streamInfo.isStreaming) {
                                const result = startFFmpegStream({
                                    id: streamInfo.id,
                                    streamVideos: streamInfo.streamVideos.map(sv => ({
                                        video: { path: sv.video.path, filename: sv.video.filename },
                                    })),
                                    playlistMode: streamInfo.playlistMode || "LOOP",
                                    rtmpUrl: streamInfo.rtmpUrl,
                                });

                                if (!result) {
                                    console.error(`[FFmpeg] Failed to restart stream ${stream.id}`);
                                    await prisma.rtmpStream.update({
                                        where: { id: stream.id },
                                        data: { isStreaming: false, currentVideo: null },
                                    });
                                    cleanupStreamData(stream.id);
                                }
                            } else {
                                console.log(`[FFmpeg] Stream ${stream.id} was set to offline or deleted, not restarting`);
                                cleanupStreamData(stream.id);
                            }
                        } catch (e) {
                            console.error(`[FFmpeg] Error during stream restart:`, e);
                            try {
                                await prisma.rtmpStream.update({
                                    where: { id: stream.id },
                                    data: { isStreaming: false, currentVideo: null },
                                });
                            } catch (dbError) {
                                console.error(`[FFmpeg] Error updating stream status:`, dbError);
                            }
                            cleanupStreamData(stream.id);
                        }
                    }, backoffMs);

                    return;
                }

                console.error(`[FFmpeg] Maximum retry attempts (${MAX_RETRY_ATTEMPTS}) reached for stream ${stream.id}`);
            }

            // Update database status
            if (wasActive) {
                try {
                    await prisma.rtmpStream.update({
                        where: { id: stream.id },
                        data: { isStreaming: false, currentVideo: null },
                    });
                    await prisma.streamLog.create({
                        data: {
                            streamId: stream.id,
                            action: code === 0 ? "COMPLETED" : "ERROR",
                            message: code === 0 ? "Stream completed" : `Stream ended with code ${code}`,
                        },
                    });
                } catch (e) {
                    console.error(`[FFmpeg] Error updating stream status:`, e);
                }
                cleanupStreamData(stream.id);
            }
        });

        // Handle process error
        ffmpegProcess.on("error", async (err) => {
            console.error(`[FFmpeg] Process error for stream ${stream.id}:`, err.message);
            startingStreams.delete(stream.id);
            runningStreams.delete(stream.id);
            try {
                await prisma.rtmpStream.update({
                    where: { id: stream.id },
                    data: { isStreaming: false, currentVideo: null },
                });
            } catch (e) {
                console.error(`[FFmpeg] Error updating stream status:`, e);
            }
            cleanupStreamData(stream.id);
        });

        // Start video monitor
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

// Async cleanup of concat file with retry for Windows EBUSY
async function cleanupConcatFile(concatFile: string): Promise<void> {
    const maxRetries = 5;
    const retryDelay = 500; // 500ms between retries
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            if (fs.existsSync(concatFile)) {
                fs.unlinkSync(concatFile);
                console.log(`[FFmpeg] Cleaned up concat file: ${concatFile}`);
            }
            return;
        } catch (e: unknown) {
            const error = e as NodeJS.ErrnoException;
            if (error.code === "EBUSY" && attempt < maxRetries - 1) {
                // File is still locked by FFmpeg, wait and retry
                await new Promise(resolve => setTimeout(resolve, retryDelay));
                continue;
            }
            // Last attempt or different error
            if (attempt === maxRetries - 1) {
                console.warn(`[FFmpeg] Could not delete concat file after ${maxRetries} attempts, will be cleaned up later: ${concatFile}`);
            }
        }
    }
}

export const stopFFmpegStream = async (streamId: string): Promise<void> => {
    const streamInfo = runningStreams.get(streamId);
    const isActive = streamInfo !== undefined;
    const isStarting = startingStreams.has(streamId);

    console.log(`[FFmpeg] Stop request for stream ${streamId}, isActive: ${isActive}, isStarting: ${isStarting}`);

    // Clean up starting state
    startingStreams.delete(streamId);

    if (!isActive) {
        // Stream not active in memory, but might be marked as live in DB
        try {
            const stream = await prisma.rtmpStream.findUnique({ where: { id: streamId } });
            if (stream && stream.isStreaming) {
                console.log(`[FFmpeg] Stream ${streamId} not active in memory but status is 'live' in DB. Fixing status.`);
                await prisma.rtmpStream.update({
                    where: { id: streamId },
                    data: { isStreaming: false, currentVideo: null },
                });
                cleanupStreamData(streamId);
            }
        } catch (e) {
            console.error(`[FFmpeg] Error checking stream status:`, e);
        }
        return;
    }

    console.log(`[FFmpeg] Stopping active stream ${streamId}`);
    manuallyStoppingStreams.add(streamId);

    const ffmpegProcess = streamInfo.process;
    const concatFile = streamInfo.concatFile;

    // Kill the process first
    try {
        if (ffmpegProcess && typeof ffmpegProcess.kill === "function") {
            ffmpegProcess.kill("SIGTERM");
        }
    } catch (e) {
        console.error(`[FFmpeg] Error killing FFmpeg process:`, e);
        manuallyStoppingStreams.delete(streamId);
    }

    // Remove from running streams immediately
    runningStreams.delete(streamId);
    cleanupStreamData(streamId);

    console.info(`[FFmpeg] Stream ${streamId} stopped`);

    // Clean up concat file asynchronously (with retry for Windows EBUSY)
    if (concatFile) {
        // Delay cleanup to allow FFmpeg to fully release the file
        setTimeout(() => {
            cleanupConcatFile(concatFile).catch(e => {
                console.error(`[FFmpeg] Error in async cleanup:`, e);
            });
        }, 1000);
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

// Sync stream statuses (like StreamFlow) - check DB vs memory
export const syncStreamStatuses = async (): Promise<void> => {
    try {
        console.log("[FFmpeg] Syncing stream statuses...");

        // Find all streams marked as live in DB
        const liveStreams = await prisma.rtmpStream.findMany({
            where: { isStreaming: true },
        });

        for (const stream of liveStreams) {
            const isReallyActive = runningStreams.has(stream.id);
            const isStartingUp = startingStreams.has(stream.id);

            // Skip streams that are currently starting up
            if (isStartingUp) {
                console.log(`[FFmpeg] Stream ${stream.id} is starting up, skipping sync`);
                continue;
            }

            if (!isReallyActive) {
                // Check if it's in retry process
                const retryCount = streamRetryCount.get(stream.id);
                const isRetrying = retryCount !== undefined && retryCount > 0 && retryCount < MAX_RETRY_ATTEMPTS;

                if (isRetrying) {
                    console.log(`[FFmpeg] Stream ${stream.id} is in retry process, skipping sync`);
                    continue;
                }

                console.log(`[FFmpeg] Found inconsistent stream ${stream.id}: marked as 'live' in DB but not active in memory`);
                await prisma.rtmpStream.update({
                    where: { id: stream.id },
                    data: { isStreaming: false, currentVideo: null },
                });
                console.log(`[FFmpeg] Updated stream ${stream.id} status to 'offline'`);
                cleanupStreamData(stream.id);
            }
        }

        // Check active streams in memory
        const activeStreamIds = Array.from(runningStreams.keys());
        for (const streamId of activeStreamIds) {
            const stream = await prisma.rtmpStream.findUnique({ where: { id: streamId } });
            const streamData = runningStreams.get(streamId);

            if (!stream) {
                console.log(`[FFmpeg] Stream ${streamId} not found in DB, stopping orphaned process`);
                const ffmpegProcess = streamData?.process;
                if (ffmpegProcess && typeof ffmpegProcess.kill === "function") {
                    try {
                        ffmpegProcess.kill("SIGTERM");
                    } catch (e) {
                        console.error(`[FFmpeg] Error killing orphaned process:`, e);
                    }
                }
                runningStreams.delete(streamId);
                cleanupStreamData(streamId);
            } else if (!stream.isStreaming) {
                console.log(`[FFmpeg] Stream ${streamId} active in memory but status is 'offline' in DB, updating to 'live'`);
                await prisma.rtmpStream.update({
                    where: { id: streamId },
                    data: { isStreaming: true },
                });
            }

            // Check if FFmpeg process has exited
            if (streamData) {
                const ffmpegProcess = streamData.process;
                if (ffmpegProcess && ffmpegProcess.exitCode !== null) {
                    console.log(`[FFmpeg] FFmpeg process for stream ${streamId} has exited, cleaning up`);
                    runningStreams.delete(streamId);
                    if (stream) {
                        await prisma.rtmpStream.update({
                            where: { id: streamId },
                            data: { isStreaming: false, currentVideo: null },
                        });
                    }
                    cleanupStreamData(streamId);
                }
            }
        }

        console.log(`[FFmpeg] Stream status sync completed. Active streams: ${runningStreams.size}`);
    } catch (error) {
        console.error("[FFmpeg] Error syncing stream statuses:", error);
    }
};

// Run sync every 5 minutes
setInterval(syncStreamStatuses, 5 * 60 * 1000);
