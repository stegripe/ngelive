import { clearInterval, setInterval } from "node:timers";
import { type NextRequest } from "next/server";
import eventEmitter, { type AppEvent } from "@/lib/event-emitter";
import { verifyToken } from "@/lib/jwt";

export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
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
            const connectMessage = `data: ${JSON.stringify({ type: "connected", timestamp: Date.now() })}\n\n`;
            controller.enqueue(encoder.encode(connectMessage));

            const unsubscribe = eventEmitter.subscribe((event: AppEvent) => {
                try {
                    const message = `data: ${JSON.stringify(event)}\n\n`;
                    controller.enqueue(encoder.encode(message));
                } catch {
                    // Stream might be closed, ignore
                }
            });

            const keepaliveInterval = setInterval(() => {
                try {
                    const keepalive = `: keepalive ${Date.now()}\n\n`;
                    controller.enqueue(encoder.encode(keepalive));
                } catch {
                    clearInterval(keepaliveInterval);
                }
            }, 30000);

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
