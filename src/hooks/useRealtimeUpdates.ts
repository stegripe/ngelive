"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { type EventType } from "@/lib/event-emitter";

type ClientEventType = EventType | "connected";

interface ClientAppEvent {
    type: ClientEventType;
    data: unknown;
    timestamp: number;
}

export function useRealtimeUpdates() {
    const queryClient = useQueryClient();
    const eventSourceRef = useRef<EventSource | null>(null);
    const reconnectTimeoutRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null);

    useEffect(() => {
        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

        if (!token) {
            return;
        }

        const connect = () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }

            const eventSource = new EventSource(`/api/events?token=${encodeURIComponent(token)}`);
            eventSourceRef.current = eventSource;

            eventSource.onmessage = (event) => {
                try {
                    const data: ClientAppEvent = JSON.parse(event.data);

                    switch (data.type) {
                        case "connected":
                            console.info("Real-time connection established");
                            break;

                        case "stream:created":
                        case "stream:updated":
                        case "stream:deleted":
                        case "stream:started":
                        case "stream:stopped":
                        case "video:added_to_stream":
                        case "video:removed_from_stream":
                        case "video:reordered":
                            queryClient.invalidateQueries({ queryKey: ["streams"] });
                            break;

                        case "video:created":
                        case "video:deleted":
                            queryClient.invalidateQueries({ queryKey: ["videos"] });
                            queryClient.invalidateQueries({ queryKey: ["streams"] });
                            break;

                        case "user:created":
                        case "user:updated":
                        case "user:deleted":
                            queryClient.invalidateQueries({ queryKey: ["users"] });
                            break;

                        default:
                            break;
                    }
                } catch {
                    // Ignore parse errors (e.g., keepalive messages)
                }
            };

            eventSource.onerror = () => {
                eventSource.close();
                eventSourceRef.current = null;

                reconnectTimeoutRef.current = globalThis.setTimeout(() => {
                    connect();
                }, 5000);
            };
        };

        connect();

        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
            }
            if (reconnectTimeoutRef.current) {
                globalThis.clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
            }
        };
    }, [queryClient]);
}
