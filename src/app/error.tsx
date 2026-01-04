"use client";

import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

interface ErrorProps {
    error: Error & { digest?: string };
    reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorProps) {
    useEffect(() => {
        console.error("Page error:", error);
    }, [error]);

    const handleGoHome = () => {
        window.location.href = "/";
    };

    return (
        <div className="min-h-[60vh] flex items-center justify-center p-6">
            <div className="max-w-md w-full text-center">
                <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                    <AlertTriangle className="w-8 h-8 text-red-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h2>
                <p className="text-gray-600 mb-6">An unexpected error occurred.</p>
                <div className="flex gap-3 justify-center">
                    <Button onClick={reset} className="flex items-center gap-2">
                        <RefreshCw className="w-4 h-4" />
                        Try Again
                    </Button>
                    <Button
                        variant="outline"
                        onClick={handleGoHome}
                        className="flex items-center gap-2"
                    >
                        <Home className="w-4 h-4" />
                        Home
                    </Button>
                </div>
            </div>
        </div>
    );
}
