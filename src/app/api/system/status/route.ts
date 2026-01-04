import { type NextRequest } from "next/server";
import { getAuthUser, requireAdmin } from "@/lib/auth";
import { getSystemStatus, getCurrentQuality, setQualityPreset } from "@/lib/ffmpeg";
import { sendError, sendSuccess } from "@/lib/response";

// GET /api/system/status - Get system status (Admin only)
export async function GET(request: NextRequest) {
    try {
        const authUser = await getAuthUser(request);
        const authError = requireAdmin(authUser);
        if (authError) return authError;

        const status = getSystemStatus();

        return sendSuccess({ 
            status: {
                ...status,
                timestamp: new Date().toISOString(),
            }
        }, "System status retrieved");
    } catch (error) {
        console.error("Get system status error:", error);
        return sendError("Failed to get system status", 500);
    }
}

// PUT /api/system/status - Update system settings (Admin only)
export async function PUT(request: NextRequest) {
    try {
        const authUser = await getAuthUser(request);
        const authError = requireAdmin(authUser);
        if (authError) return authError;

        const body = await request.json();
        const { quality } = body;

        if (quality) {
            const validQualities = ["ultralow", "low", "medium", "high"];
            if (!validQualities.includes(quality)) {
                return sendError(`Invalid quality preset. Valid options: ${validQualities.join(", ")}`, 400);
            }
            setQualityPreset(quality);
        }

        const status = getSystemStatus();

        return sendSuccess({ 
            status,
            message: `Quality preset updated to: ${quality}` 
        }, "System settings updated");
    } catch (error) {
        console.error("Update system settings error:", error);
        return sendError("Failed to update system settings", 500);
    }
}
