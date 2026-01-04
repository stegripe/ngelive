import { cn } from "@/lib/utils";
import * as React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    error?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, error, ...props }, ref) => {
        return (
            <input
                type={type}
                className={cn(
                    "flex h-10 w-full rounded-lg border bg-gray-800/50 px-4 py-2 text-sm text-white placeholder:text-gray-500 transition-all duration-200",
                    "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                    error 
                        ? "border-red-500/50 focus:ring-red-500 focus:border-red-500" 
                        : "border-gray-700 focus:ring-primary-500 focus:border-primary-500 hover:border-gray-600",
                    className
                )}
                ref={ref}
                {...props}
            />
        );
    }
);

Input.displayName = "Input";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    error?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ className, error, ...props }, ref) => {
        return (
            <textarea
                className={cn(
                    "flex w-full rounded-lg border bg-gray-800/50 px-4 py-3 text-sm text-white placeholder:text-gray-500 transition-all duration-200 min-h-[100px] resize-none",
                    "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                    error 
                        ? "border-red-500/50 focus:ring-red-500 focus:border-red-500" 
                        : "border-gray-700 focus:ring-primary-500 focus:border-primary-500 hover:border-gray-600",
                    className
                )}
                ref={ref}
                {...props}
            />
        );
    }
);

Textarea.displayName = "Textarea";

export { Input, Textarea };
