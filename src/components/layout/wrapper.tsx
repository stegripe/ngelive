"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Header } from "./header";
import { Sidebar } from "./sidebar";
import { LoadingSpinner } from "@/components/ui/loading";

interface LayoutWrapperProps {
    children: React.ReactNode;
}

export function LayoutWrapper({ children }: LayoutWrapperProps) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        if (!loading && !user) {
            router.push("/login");
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900">
                <LoadingSpinner size="lg" message="Loading..." />
            </div>
        );
    }

    if (!user) {
        return null;
    }

    return (
        <div className="bg-gray-900 h-screen">
            <div className="flex h-full">
                {/* Sidebar */}
                <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />

                {/* Main content */}
                <div className="flex-1 flex flex-col min-h-screen lg:ml-0">
                    <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
                    <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
                        <div className="max-w-7xl mx-auto">{children}</div>
                    </main>
                </div>
            </div>
        </div>
    );
}
