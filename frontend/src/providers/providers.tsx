"use client";

import { AuthProvider } from "@/lib/auth";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 5 * 60 * 1000, // 5 minutes
                        cacheTime: 10 * 60 * 1000, // 10 minutes
                        refetchOnWindowFocus: false,
                        retry: 1,
                    },
                    mutations: {
                        retry: 1,
                    },
                },
            })
    );

    return (
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                {children}
                <Toaster
                    position="top-right"
                    toastOptions={{
                        style: {
                            background: "#374151",
                            color: "#fff",
                            border: "1px solid #4B5563",
                        },
                    }}
                />
            </AuthProvider>
        </QueryClientProvider>
    );
}
