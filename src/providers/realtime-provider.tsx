"use client";

import { type ReactNode } from "react";
import { useRealtimeUpdates } from "@/hooks/useRealtimeUpdates";

function RealtimeUpdatesConnector() {
    useRealtimeUpdates();
    return null;
}

export function RealtimeProvider({ children }: { children: ReactNode }) {
    return (
        <>
            <RealtimeUpdatesConnector />
            {children}
        </>
    );
}
