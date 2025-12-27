"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Header } from "./header";
import { Sidebar } from "./sidebar";

interface LayoutWrapperProps {
    children: React.ReactNode;
}

export function LayoutWrapper({ children }: LayoutWrapperProps) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push("/login");
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4" />
                    <p className="text-gray-400">Loading...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-900">
            <Header />
            <div className="flex">
                <Sidebar />
                <main className="flex-1 p-6 ml-64">{children}</main>
            </div>
        </div>
    );
}
