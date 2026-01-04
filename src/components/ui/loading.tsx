"use client";

import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
    className?: string;
    size?: "sm" | "md" | "lg";
    message?: string;
}

export function LoadingSpinner({
    className,
    size = "md",
    message = "Loading...",
}: LoadingSpinnerProps) {
    const sizeClasses = {
        sm: "h-6 w-6",
        md: "h-8 w-8",
        lg: "h-12 w-12",
    };

    return (
        <div className={cn("flex items-center justify-center", className)}>
            <div className="text-center">
                <div
                    className={cn(
                        "animate-spin rounded-full border-b-2 border-primary-500 mx-auto mb-4",
                        sizeClasses[size],
                    )}
                />
                {message && <p className="text-gray-400">{message}</p>}
            </div>
        </div>
    );
}
