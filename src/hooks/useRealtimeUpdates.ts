"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth-context";

type EventType = "streams" | "videos" | "users" | "connected";

interface RealtimeEvent {
    type: EventType;
    timestamp: number;
}

const eventToQueryKeyMap: Record<string, string[]> = {
    streams: ["streams"],
    videos: ["videos"],
    users: ["users"],
};

export function useRealtimeUpdates() {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const eventSourceRef = useRef<EventSource | null>(null);
    const reconnectTimeoutRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null);
    const reconnectAttempts = useRef(0);
    const maxReconnectAttempts = 5;
    const baseReconnectDelay = 1000;

    const connect = useCallback(() => {
        // Check if we're in a browser environment
        if (typeof window === "undefined" || typeof EventSource === "undefined") {
            return;
        }

        if (!user || eventSourceRef.current?.readyState === EventSource.OPEN) {
            return;
        }

        // Close existing connection if any
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }

        const token = localStorage.getItem("token");
        if (!token) {
            return;
        }

        // Create EventSource with authorization header via query param
        // Note: SSE doesn't support custom headers, so we use the cookie/session from the browser
        const eventSource = new EventSource(`/api/events?token=${encodeURIComponent(token)}`);
        eventSourceRef.current = eventSource;

        eventSource.onopen = () => {
            reconnectAttempts.current = 0;
        };

        eventSource.onmessage = (event) => {
            try {
                const data: RealtimeEvent = JSON.parse(event.data);

                if (data.type === "connected") {
                    return;
                }

                // Invalidate the corresponding query
                const queryKeys = eventToQueryKeyMap[data.type];
                if (queryKeys) {
                    queryClient.invalidateQueries({ queryKey: queryKeys });
                }
            } catch (error) {
                console.error("Error parsing SSE event:", error);
            }
        };

        eventSource.onerror = () => {
            eventSource.close();
            eventSourceRef.current = null;

            // Attempt to reconnect with exponential backoff
            if (reconnectAttempts.current < maxReconnectAttempts) {
                const delay = baseReconnectDelay * 2 ** reconnectAttempts.current;
                reconnectAttempts.current++;

                reconnectTimeoutRef.current = globalThis.setTimeout(() => {
                    connect();
                }, delay);
            }
        };
    }, [user, queryClient]);

    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            globalThis.clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }

        reconnectAttempts.current = 0;
    }, []);

    useEffect(() => {
        if (user) {
            connect();
        } else {
            disconnect();
        }

        return () => {
            disconnect();
        };
    }, [user, connect, disconnect]);

    return {
        isConnected:
            typeof window !== "undefined" &&
            eventSourceRef.current?.readyState === EventSource?.OPEN,
        reconnect: connect,
        disconnect,
    };
}
