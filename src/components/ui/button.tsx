import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "default" | "outline" | "ghost" | "danger" | "success";
    size?: "default" | "sm" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "default", size = "default", ...props }, ref) => {
        return (
            <button
                className={cn(
                    "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]",
                    {
                        "bg-primary-600 text-white hover:bg-primary-500 focus:ring-primary-500 shadow-lg shadow-primary-600/25":
                            variant === "default",
                        "border border-gray-600 bg-transparent text-gray-300 hover:bg-gray-800 hover:border-gray-500 focus:ring-gray-500":
                            variant === "outline",
                        "text-gray-400 hover:bg-gray-800 hover:text-white focus:ring-gray-500":
                            variant === "ghost",
                        "bg-red-600 text-white hover:bg-red-500 focus:ring-red-500 shadow-lg shadow-red-600/25":
                            variant === "danger",
                        "bg-green-600 text-white hover:bg-green-500 focus:ring-green-500 shadow-lg shadow-green-600/25":
                            variant === "success",
                    },
                    {
                        "h-10 py-2 px-4 text-sm": size === "default",
                        "h-8 px-3 text-xs": size === "sm",
                        "h-12 px-6 text-base": size === "lg",
                        "h-9 w-9 p-0": size === "icon",
                    },
                    className,
                )}
                ref={ref}
                {...props}
            />
        );
    },
);

Button.displayName = "Button";

export { Button };
