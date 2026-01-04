import { clearInterval, setInterval } from "node:timers";
import { type NextRequest } from "next/server";
import eventEmitter, { type AppEvent } from "@/lib/event-emitter";
import { verifyToken } from "@/lib/jwt";

// SSE endpoint for real-time updates
export function GET(request: NextRequest) {
    // Get token from query params (EventSource doesn't support custom headers)
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
        return new Response("Unauthorized", { status: 401 });
    }

    try {
        verifyToken(token);
    } catch {
        return new Response("Invalid token", { status: 401 });
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        start(controller) {
            // Send initial connection message
            const connectMessage = `data: ${JSON.stringify({ type: "connected", timestamp: Date.now() })}\n\n`;
            controller.enqueue(encoder.encode(connectMessage));

            // Subscribe to events
            const unsubscribe = eventEmitter.subscribe((event: AppEvent) => {
                try {
                    const message = `data: ${JSON.stringify(event)}\n\n`;
                    controller.enqueue(encoder.encode(message));
                } catch {
                    // Stream might be closed, ignore
                }
            });

            // Send keepalive every 30 seconds
            const keepaliveInterval = setInterval(() => {
                try {
                    const keepalive = `: keepalive ${Date.now()}\n\n`;
                    controller.enqueue(encoder.encode(keepalive));
                } catch {
                    clearInterval(keepaliveInterval);
                }
            }, 30000);

            // Handle client disconnect
            request.signal.addEventListener("abort", () => {
                unsubscribe();
                clearInterval(keepaliveInterval);
                try {
                    controller.close();
                } catch {
                    // Already closed
                }
            });
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
