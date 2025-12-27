import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "default" | "outline" | "ghost" | "danger" | "success";
    size?: "default" | "sm" | "lg";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "default", size = "default", ...props }, ref) => {
        return (
            <button
                className={cn(
                    "inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none",
                    {
                        "bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500":
                            variant === "default",
                        "border border-gray-600 bg-transparent text-gray-300 hover:bg-gray-700 focus:ring-gray-500":
                            variant === "outline",
                        "text-gray-300 hover:bg-gray-700 focus:ring-gray-500": variant === "ghost",
                        "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500":
                            variant === "danger",
                        "bg-green-600 text-white hover:bg-green-700 focus:ring-green-500":
                            variant === "success",
                    },
                    {
                        "h-10 py-2 px-4": size === "default",
                        "h-9 px-3": size === "sm",
                        "h-11 px-8": size === "lg",
                    },
                    className
                )}
                ref={ref}
                {...props}
            />
        );
    }
);

Button.displayName = "Button";

export { Button };
