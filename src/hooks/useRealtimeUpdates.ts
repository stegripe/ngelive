"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { type EventType } from "@/lib/event-emitter";

type ClientEventType = EventType | "connected";

interface ClientAppEvent {
    type: ClientEventType;
    data: unknown;
    timestamp: number;
}

export function useRealtimeUpdates() {
    const queryClient = useQueryClient();
    const { refreshUser, user } = useAuth();
    const eventSourceRef = useRef<EventSource | null>(null);
    const reconnectTimeoutRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null);
    const reconnectAttempts = useRef(0);
    const userIdRef = useRef(user?.id);

    useEffect(() => {
        userIdRef.current = user?.id;
    }, [user?.id]);

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

            eventSource.onopen = () => {
                reconnectAttempts.current = 0;
                console.info("[SSE] Real-time connection established");
            };

            eventSource.onmessage = (event) => {
                try {
                    const data: ClientAppEvent = JSON.parse(event.data);

                    switch (data.type) {
                        case "connected":
                            console.info("[SSE] Connection confirmed by server");
                            break;

                        case "stream:created":
                        case "stream:updated":
                        case "stream:deleted":
                        case "stream:started":
                        case "stream:stopped":
                        case "video:added_to_stream":
                        case "video:removed_from_stream":
                        case "video:reordered":
                            console.info(`[SSE] Stream event: ${data.type}`);
                            queryClient.invalidateQueries({ queryKey: ["streams"] });
                            queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
                            queryClient.invalidateQueries({ queryKey: ["systemStatus"] });
                            break;

                        case "video:created":
                        case "video:deleted":
                            console.info(`[SSE] Video event: ${data.type}`);
                            queryClient.invalidateQueries({ queryKey: ["videos"] });
                            queryClient.invalidateQueries({ queryKey: ["streams"] });
                            queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
                            break;

                        case "user:created":
                        case "user:updated":
                        case "user:deleted":
                            console.info(`[SSE] User event: ${data.type}`);
                            queryClient.invalidateQueries({ queryKey: ["users"] });
                            queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
                            if (data.type === "user:updated") {
                                const eventData = data.data as
                                    | { user?: { id?: string } }
                                    | undefined;
                                if (eventData?.user?.id === userIdRef.current) {
                                    refreshUser();
                                }
                            }
                            break;

                        default:
                            break;
                    }
                } catch {
                    // Ignore parse errors (e.g., keepalive messages)
                }
            };

            eventSource.onerror = () => {
                console.warn("[SSE] Connection error, reconnecting...");
                eventSource.close();
                eventSourceRef.current = null;

                const delay = Math.min(1000 * 2 ** reconnectAttempts.current, 10000);
                reconnectAttempts.current++;

                reconnectTimeoutRef.current = globalThis.setTimeout(() => {
                    connect();
                }, delay);
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
    }, [queryClient, refreshUser]);
}
