import { type ChildProcess, execSync, spawn } from "node:child_process";
import nodeProcess from "node:process";
import { clearTimeout, setTimeout } from "node:timers";
import prisma from "./prisma";

// ============================================================================
// FFmpeg Service - Optimized for Low-Spec Servers (1 vCPU / 1GB RAM)
// ============================================================================

// Store running FFmpeg processes with metadata
interface StreamProcess {
    process: ChildProcess;
    startTime: Date;
    videoIndex: number;
    retryCount: number;
    lastError?: string;
}

const runningStreams: Map<string, StreamProcess> = new Map();

// Quality preset types
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

// Quality presets
const QUALITY_PRESETS: Record<QualityLevel, QualityPreset> = {
    // Ultra-low spec: 1 vCPU, 512MB RAM
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
    // Low spec: 1 vCPU, 1GB RAM (DEFAULT)
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
    // Medium spec: 2 vCPU, 2GB RAM
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
    // High spec: 4+ vCPU, 4GB+ RAM
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

// Configuration - Optimized for 1 vCPU / 1GB RAM
const CONFIG = {
    // Maximum concurrent streams (adjust based on server capacity)
    MAX_CONCURRENT_STREAMS: 2,

    // FFmpeg process limits
    MAX_RETRY_COUNT: 3,
    RETRY_DELAY_MS: 5000,

    // Memory management
    FFMPEG_NICE_PRIORITY: 10, // Lower priority (higher nice value)

    // Current quality setting - change based on server specs
    CURRENT_QUALITY: "low" as QualityLevel,
};

// Get current quality preset
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

// Check if FFmpeg is available
const checkFFmpegAvailable = (): boolean => {
    try {
        execSync("ffmpeg -version", { stdio: "ignore" });
        return true;
    } catch {
        return false;
    }
};

// Get system memory info (simplified)
const getAvailableMemoryMB = (): number => {
    try {
        if (nodeProcess.platform === "win32") {
            const output = execSync("wmic OS get FreePhysicalMemory /Value", { encoding: "utf-8" });
            const match = output.match(/FreePhysicalMemory=(\d+)/);
            return match ? Math.floor(Number.parseInt(match[1], 10) / 1024) : 512;
        }
        const output = execSync("free -m | grep Mem | awk '{print $7}'", { encoding: "utf-8" });
        return Number.parseInt(output.trim(), 10) || 512;
    } catch {
        return 512; // Default assumption
    }
};

// Build optimized FFmpeg arguments
const buildFFmpegArgs = (inputFile: string, rtmpUrl: string): string[] => {
    const preset = getQualityPreset();
    const [width, height] = preset.resolution.split("x");

    return [
        // Input options
        "-re", // Real-time mode
        "-i",
        inputFile,

        // Video filters - scale with hardware acceleration fallback
        "-vf",
        `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,format=yuv420p`,

        // Video codec settings - OPTIMIZED for low CPU
        "-c:v",
        "libx264",
        "-preset",
        preset.preset, // ultrafast/superfast for low CPU
        "-tune",
        "zerolatency", // Minimize latency
        "-profile:v",
        "baseline", // Baseline for compatibility & lower CPU
        "-level",
        "3.1", // Compatible level
        "-crf",
        preset.crf, // Quality-based encoding
        "-b:v",
        preset.videoBitrate,
        "-maxrate",
        preset.maxrate,
        "-bufsize",
        preset.bufsize,

        // Keyframe settings - longer GOP for efficiency
        "-g",
        "120", // Keyframe every 4 seconds at 30fps
        "-keyint_min",
        "60",
        "-sc_threshold",
        "0", // Disable scene change detection

        // Frame rate control
        "-r",
        "30", // Lock to 30fps
        "-fps_mode",
        "cfr", // Constant frame rate

        // Audio settings - OPTIMIZED
        "-c:a",
        "aac",
        "-b:a",
        preset.audioBitrate,
        "-ar",
        preset.audioSampleRate,
        "-ac",
        "2", // Stereo

        // Threading - controlled
        "-threads",
        String(preset.threads),
        "-thread_type",
        "slice", // Slice-based threading (less memory)

        // Buffer and stability settings
        "-max_muxing_queue_size",
        "512", // Reduced from 1024
        "-fflags",
        "+genpts+igndts", // Generate PTS, ignore DTS issues
        "-avoid_negative_ts",
        "make_zero",

        // RTMP output settings
        "-rtmp_buffer",
        "2048", // Reduced buffer
        "-rtmp_live",
        "live",
        "-f",
        "flv",
        rtmpUrl,
    ];
};

// Build minimal FFmpeg args for copy mode (if source already encoded)
const buildFFmpegArgsCopyMode = (inputFile: string, rtmpUrl: string): string[] => {
    return [
        "-re",
        "-i",
        inputFile,
        "-c",
        "copy", // Copy without re-encoding (0 CPU!)
        "-f",
        "flv",
        "-flvflags",
        "no_duration_filesize",
        rtmpUrl,
    ];
};

// Check if video is compatible for copy mode
const canUseCopyMode = (videoPath: string): boolean => {
    try {
        // Check if video is already H.264 + AAC in compatible format
        const output = execSync(
            `ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,width,height -of csv=p=0 "${videoPath}"`,
            { encoding: "utf-8" },
        );
        const [codec, width] = output.trim().split(",");

        // Only use copy mode if already h264 and reasonable resolution
        return codec === "h264" && Number.parseInt(width, 10) <= 1920;
    } catch {
        return false;
    }
};

// Start FFmpeg stream with optimizations
export const startFFmpegStream = (stream: FFmpegStream): boolean => {
    try {
        // Check if already running
        if (runningStreams.has(stream.id)) {
            console.info(`[FFmpeg] Stream ${stream.id} is already running`);
            return false;
        }

        // Check concurrent stream limit
        if (runningStreams.size >= CONFIG.MAX_CONCURRENT_STREAMS) {
            console.warn(
                `[FFmpeg] Maximum concurrent streams reached (${CONFIG.MAX_CONCURRENT_STREAMS})`,
            );
            return false;
        }

        // Check FFmpeg availability
        if (!checkFFmpegAvailable()) {
            console.error("[FFmpeg] FFmpeg is not installed or not in PATH");
            return false;
        }

        // Check available memory
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

        const loopForever = stream.playlistMode === "LOOP";
        const shuffleMode = stream.playlistMode === "SHUFFLE";

        // Shuffle videos if needed
        if (shuffleMode) {
            for (let i = videoFiles.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [videoFiles[i], videoFiles[j]] = [videoFiles[j], videoFiles[i]];
            }
        }

        // Main streaming loop
        const runLoop = async () => {
            let stopRequested = false;
            let retryCount = 0;

            do {
                for (let videoIndex = 0; videoIndex < videoFiles.length; videoIndex++) {
                    if (stopRequested) {
                        break;
                    }

                    const currentVideo = videoFiles[videoIndex];

                    // Update current video in database
                    try {
                        await prisma.rtmpStream.update({
                            where: { id: stream.id },
                            data: { currentVideo: currentVideo.filename },
                        });
                    } catch (e) {
                        console.error(`[FFmpeg] Failed to update current video:`, e);
                    }

                    // Check if copy mode can be used (saves CPU!)
                    const useCopyMode = await canUseCopyMode(currentVideo.path);

                    const ffmpegArgs = useCopyMode
                        ? buildFFmpegArgsCopyMode(currentVideo.path, stream.rtmpUrl)
                        : buildFFmpegArgs(currentVideo.path, stream.rtmpUrl);

                    console.info(
                        `[FFmpeg] Starting stream ${stream.id} - Video: ${currentVideo.filename} (Copy mode: ${useCopyMode})`,
                    );

                    // Spawn FFmpeg with low priority
                    const ffmpeg = spawn("ffmpeg", ffmpegArgs, {
                        stdio: ["ignore", "pipe", "pipe"],
                        // On Windows, can't set nice directly
                    });

                    // Store process info
                    runningStreams.set(stream.id, {
                        process: ffmpeg,
                        startTime: new Date(),
                        videoIndex,
                        retryCount,
                    });

                    // Handle stdout (usually empty for FFmpeg)
                    ffmpeg.stdout?.on("data", (_data) => {
                        // Minimal logging to reduce overhead
                    });

                    // Handle stderr (FFmpeg logs here)
                    let lastProgress = "";
                    ffmpeg.stderr?.on("data", (data) => {
                        const output = data.toString();

                        // Only log errors and important info
                        if (output.includes("Error") || output.includes("error")) {
                            console.error(`[FFmpeg ${stream.id}] ${output.trim()}`);
                            const streamInfo = runningStreams.get(stream.id);
                            if (streamInfo) {
                                streamInfo.lastError = output.trim();
                            }
                        }

                        // Log progress occasionally
                        if (output.includes("frame=") && output !== lastProgress) {
                            lastProgress = output;
                            // Uncomment for debug: console.debug(`[FFmpeg ${stream.id}] ${output.trim()}`);
                        }
                    });

                    // Wait for process to complete
                    const exitCode = await new Promise<number | null>((resolve) => {
                        ffmpeg.on("close", (code) => {
                            console.info(
                                `[FFmpeg] Stream ${stream.id} video ended with code ${code}`,
                            );
                            resolve(code);
                        });

                        ffmpeg.on("error", (error) => {
                            console.error(`[FFmpeg] Stream ${stream.id} error:`, error.message);
                            resolve(null);
                        });
                    });

                    // Check if manually stopped
                    if (!runningStreams.has(stream.id)) {
                        stopRequested = true;
                        break;
                    }

                    // Handle exit codes
                    if (exitCode !== 0 && exitCode !== null) {
                        retryCount++;
                        const streamInfo = runningStreams.get(stream.id);

                        if (retryCount >= CONFIG.MAX_RETRY_COUNT) {
                            console.error(
                                `[FFmpeg] Stream ${stream.id} max retries reached. Stopping.`,
                            );
                            stopRequested = true;

                            // Log error to database
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
                        retryCount = 0; // Reset on success
                    }

                    // Small delay between videos to prevent CPU spike
                    if (!stopRequested && videoIndex < videoFiles.length - 1) {
                        await new Promise((r) => setTimeout(r, 1000));
                    }
                }

                // Shuffle again for next loop iteration
                if (shuffleMode && loopForever && !stopRequested) {
                    for (let i = videoFiles.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [videoFiles[i], videoFiles[j]] = [videoFiles[j], videoFiles[i]];
                    }
                }
            } while (loopForever && !stopRequested);

            // Cleanup
            runningStreams.delete(stream.id);

            // Update database
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

        // Start the loop (non-blocking)
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

// Stop FFmpeg stream gracefully
export const stopFFmpegStream = async (streamId: string): Promise<void> => {
    const streamInfo = runningStreams.get(streamId);

    if (streamInfo) {
        const { process: ffmpeg } = streamInfo;

        // First try graceful quit
        ffmpeg.stdin?.write("q");

        // Give it 3 seconds to quit gracefully
        await new Promise<void>((resolve) => {
            const timeout = setTimeout(() => {
                // Force kill if still running
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

// Get list of running stream IDs
export const getRunningStreams = (): string[] => {
    return Array.from(runningStreams.keys());
};

// Get detailed info about running streams
export const getStreamInfo = (streamId: string): StreamProcess | undefined => {
    return runningStreams.get(streamId);
};

// Get all streams info
export const getAllStreamsInfo = (): Map<string, StreamProcess> => {
    return runningStreams;
};

// Update quality preset at runtime
export const setQualityPreset = (preset: QualityLevel): void => {
    CONFIG.CURRENT_QUALITY = preset;
    console.info(`[FFmpeg] Quality preset changed to: ${preset}`);
};

// Get current quality preset name
export const getCurrentQuality = (): string => {
    return CONFIG.CURRENT_QUALITY;
};

// Stop all streams (for cleanup)
export const stopAllStreams = async (): Promise<void> => {
    const streamIds = Array.from(runningStreams.keys());
    console.info(`[FFmpeg] Stopping all streams (${streamIds.length} active)`);

    await Promise.all(streamIds.map((id) => stopFFmpegStream(id)));
};

// Check system resources
export const getSystemStatus = () => {
    return {
        activeStreams: runningStreams.size,
        maxStreams: CONFIG.MAX_CONCURRENT_STREAMS,
        availableMemoryMB: getAvailableMemoryMB(),
        currentQuality: CONFIG.CURRENT_QUALITY,
        ffmpegAvailable: checkFFmpegAvailable(),
    };
};
