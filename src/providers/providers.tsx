"use client";

import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/auth-context";
import { QueryProvider } from "./query-provider";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <QueryProvider>
            <AuthProvider>
                {children}
                <Toaster position="top-right" richColors />
            </AuthProvider>
        </QueryProvider>
    );
}
