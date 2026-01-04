"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

interface SystemStatus {
    activeStreams: number;
    maxStreams: number;
    availableMemoryMB: number;
    currentQuality: string;
    ffmpegAvailable: boolean;
    timestamp: string;
}

export function useSystemStatus() {
    return useQuery({
        queryKey: ["system-status"],
        queryFn: async () => {
            const response = await api.get("/system/status");
            return response.data.data.status as SystemStatus;
        },
        refetchInterval: 30000, // Refetch every 30 seconds
        staleTime: 25000, // Consider data fresh for 25 seconds
    });
}
