"use client";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { LogOut, User } from "lucide-react";

export function Header() {
    const { user, logout } = useAuth();

    return (
        <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-bold text-white">ngelive</h1>
                    <span className="text-sm text-gray-400">by Stegripe Development</span>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-gray-300">
                        <User className="h-4 w-4" />
                        <span className="text-sm">{user?.username}</span>
                        <span className="text-xs bg-primary-600 px-2 py-1 rounded text-white">
                            {user?.role}
                        </span>
                    </div>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={logout}
                        className="text-gray-300 hover:text-white"
                    >
                        <LogOut className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </header>
    );
}
