import { cn } from "@/lib/utils";
import * as React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: "default" | "glass" | "bordered";
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
    ({ className, variant = "default", ...props }, ref) => (
        <div
            ref={ref}
            className={cn(
                "rounded-xl transition-all duration-200",
                {
                    "bg-gray-800/50 border border-gray-700/50 shadow-xl backdrop-blur-sm": variant === "default",
                    "bg-gray-800/30 border border-gray-700/30 shadow-lg backdrop-blur-md": variant === "glass",
                    "bg-transparent border-2 border-gray-700": variant === "bordered",
                },
                className
            )}
            {...props}
        />
    )
);

Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div
            ref={ref}
            className={cn("px-4 sm:px-6 py-4 border-b border-gray-700/50", className)}
            {...props}
        />
    )
);

CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
    ({ className, ...props }, ref) => (
        <h3
            ref={ref}
            className={cn("text-lg font-semibold text-white", className)}
            {...props}
        />
    )
);

CardTitle.displayName = "CardTitle";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div
            ref={ref}
            className={cn("px-4 sm:px-6 py-4", className)}
            {...props}
        />
    )
);

CardContent.displayName = "CardContent";

export { Card, CardHeader, CardTitle, CardContent };
