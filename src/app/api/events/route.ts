import { type NextRequest } from "next/server";
import { getAuthUser, requireAuth } from "@/lib/auth";
import { registerClient, unregisterClient } from "@/lib/events";

// GET /api/events - SSE endpoint for real-time updates
export async function GET(request: NextRequest) {
    const authUser = await getAuthUser(request);
    const authError = requireAuth(authUser);
    if (authError) {
        return authError;
    }

    const clientId = `${authUser!.userId}-${Date.now()}`;

    const stream = new ReadableStream<Uint8Array>({
        start(controller) {
            registerClient(clientId, controller);

            // Send initial connection message
            const encoder = new TextEncoder();
            const connectMsg = encoder.encode(
                `data: ${JSON.stringify({ type: "connected", timestamp: Date.now() })}\n\n`,
            );
            controller.enqueue(connectMsg);
        },
        cancel() {
            unregisterClient(clientId);
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
        },
    });
}
