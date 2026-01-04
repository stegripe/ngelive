"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

type EventType =
    | "connected"
    | "stream:created"
    | "stream:updated"
    | "stream:deleted"
    | "stream:started"
    | "stream:stopped"
    | "video:created"
    | "video:deleted"
    | "video:added_to_stream"
    | "video:removed_from_stream"
    | "video:reordered"
    | "user:created"
    | "user:updated"
    | "user:deleted";

interface AppEvent {
    type: EventType;
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
            // Close existing connection
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }

            // Create new EventSource connection
            const eventSource = new EventSource(`/api/events?token=${encodeURIComponent(token)}`);
            eventSourceRef.current = eventSource;

            eventSource.onmessage = (event) => {
                try {
                    const data: AppEvent = JSON.parse(event.data);

                    // Handle different event types by invalidating relevant queries
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
                            // Handle any unknown events
                            break;
                    }
                } catch {
                    // Ignore parse errors (e.g., keepalive messages)
                }
            };

            eventSource.onerror = () => {
                eventSource.close();
                eventSourceRef.current = null;

                // Reconnect after 5 seconds
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
