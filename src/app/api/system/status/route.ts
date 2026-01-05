import { type NextRequest } from "next/server";
import { getAuthUser, requireAdmin, requireAuth } from "@/lib/auth";
import { getSystemStatus, restorePreviousStreams, setQualityPreset } from "@/lib/ffmpeg";
import { sendError, sendSuccess } from "@/lib/response";

export const dynamic = "force-dynamic";

// Track if streams have been restored on startup
let streamsRestored = false;

export async function GET(request: NextRequest) {
    try {
        const authUser = await getAuthUser(request);
        const authError = requireAuth(authUser);
        if (authError) {
            return authError;
        }

        // Restore streams on first API call (one-time startup action)
        if (!streamsRestored) {
            streamsRestored = true;
            console.log("[System Status] First API call, restoring streams...");
            restorePreviousStreams().catch((err) => {
                console.error("[System Status] Error restoring streams:", err);
            });
        }

        const status = await getSystemStatus();

        return sendSuccess(
            {
                status: {
                    ...status,
                    timestamp: new Date().toISOString(),
                },
            },
            "System status retrieved",
        );
    } catch (error) {
        console.error("Get system status error:", error);
        return sendError("Failed to get system status", 500);
    }
}

export async function PUT(request: NextRequest) {
    try {
        const authUser = await getAuthUser(request);
        const authError = requireAdmin(authUser);
        if (authError) {
            return authError;
        }

        const body = await request.json();
        const { quality } = body;

        if (quality) {
            const validQualities = ["ultralow", "low", "medium", "high"];
            if (!validQualities.includes(quality)) {
                return sendError(
                    `Invalid quality preset. Valid options: ${validQualities.join(", ")}`,
                    400,
                );
            }
            setQualityPreset(quality);
        }

        const status = await getSystemStatus();

        return sendSuccess(
            {
                status,
                message: `Quality preset updated to: ${quality}`,
            },
            "System settings updated",
        );
    } catch (error) {
        console.error("Update system settings error:", error);
        return sendError("Failed to update system settings", 500);
    }
}
