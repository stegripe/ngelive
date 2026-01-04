"use client";

import { useRealtimeUpdates } from "@/hooks/useRealtimeUpdates";
import { useAuth } from "@/lib/auth-context";

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();

    if (user) {
        return <RealtimeConnector>{children}</RealtimeConnector>;
    }

    return <>{children}</>;
}

function RealtimeConnector({ children }: { children: React.ReactNode }) {
    useRealtimeUpdates();
    return <>{children}</>;
}
