import { X } from "lucide-react";
import type * as React from "react";
import { cn } from "@/lib/utils";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    className?: string;
}

export function Modal({ isOpen, onClose, title, children, className }: ModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
                className="fixed inset-0 bg-black bg-opacity-50"
                onClick={onClose}
                onKeyDown={(e) => {
                    if (e.key === "Escape" || e.key === "Enter" || e.key === " ") {
                        onClose();
                    }
                }}
                tabIndex={0}
                role="button"
                aria-label="Close modal background"
            />
            <div
                className={cn(
                    "relative bg-gray-800 rounded-lg border border-gray-700 shadow-xl w-full max-w-md mx-4",
                    className
                )}
            >
                <div className="flex items-center justify-between p-4 border-b border-gray-700">
                    <h3 className="text-lg font-semibold text-white">{title}</h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div className="p-4">{children}</div>
            </div>
        </div>
    );
}
