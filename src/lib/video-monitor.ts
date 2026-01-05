import fs from "node:fs";
import path from "node:path";
import nodeProcess from "node:process";
import { setInterval } from "node:timers";
import prisma from "./prisma";

const _VIDEO_DIR = path.resolve(nodeProcess.cwd(), "cache", "video");

let monitorStarted = false;

export function startVideoMonitor(intervalMs = 30_000) {
    if (monitorStarted) {
        return;
    }
    monitorStarted = true;

    const checkOnce = async () => {
        try {
            const videos = await prisma.video.findMany({ select: { id: true, path: true } });

            for (const v of videos) {
                if (!v.path) {
                    continue;
                }
                if (!fs.existsSync(v.path)) {
                    try {
                        await prisma.streamVideo.deleteMany({ where: { videoId: v.id } });
                        await prisma.video.delete({ where: { id: v.id } });
                        await prisma.streamLog
                            .create({
                                data: {
                                    streamId: "",
                                    action: "VIDEO_DELETED",
                                    message: `Video ${v.id} removed because file missing: ${v.path}`,
                                },
                            })
                            .catch((e) => {
                                void e;
                            });
                    } catch (e) {
                        console.error("Video monitor delete error:", e);
                    }
                }
            }
        } catch (e) {
            console.error("Video monitor error:", e);
        }
    };

    checkOnce();
    setInterval(checkOnce, intervalMs);
}

export default startVideoMonitor;
