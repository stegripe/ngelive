"use client";

import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/auth-context";
import { QueryProvider } from "./query-provider";
import { RealtimeProvider } from "./realtime-provider";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <QueryProvider>
            <AuthProvider>
                <RealtimeProvider>{children}</RealtimeProvider>
                <Toaster position="top-right" richColors />
            </AuthProvider>
        </QueryProvider>
    );
}
