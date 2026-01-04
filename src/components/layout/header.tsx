"use client";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { LogOut, Menu, User, X } from "lucide-react";

interface HeaderProps {
    sidebarOpen: boolean;
    setSidebarOpen: (open: boolean) => void;
}

export function Header({ sidebarOpen, setSidebarOpen }: HeaderProps) {
    const { user, logout } = useAuth();

    return (
        <header className="sticky top-0 z-40 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800">
            <div className="flex items-center justify-between h-16 px-4 sm:px-6">
                {/* Left side - Logo and mobile menu */}
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="lg:hidden p-2 -ml-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        {sidebarOpen ? (
                            <X className="h-5 w-5" />
                        ) : (
                            <Menu className="h-5 w-5" />
                        )}
                    </button>
                    
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-sm">N</span>
                        </div>
                        <div className="hidden sm:block">
                            <h1 className="text-lg font-bold text-white">ngelive</h1>
                        </div>
                    </div>
                </div>

                {/* Right side - User info */}
                <div className="flex items-center gap-2 sm:gap-4">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="hidden sm:flex items-center gap-2 text-gray-300">
                            <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center">
                                <User className="h-4 w-4" />
                            </div>
                            <div className="hidden md:block">
                                <p className="text-sm font-medium text-white">{user?.username}</p>
                                <p className="text-xs text-gray-400">{user?.email}</p>
                            </div>
                        </div>
                        
                        <span className={cn(
                            "text-xs px-2 py-1 rounded-full font-medium",
                            user?.role === "ADMIN" 
                                ? "bg-primary-500/20 text-primary-400 border border-primary-500/30"
                                : "bg-gray-700 text-gray-300"
                        )}>
                            {user?.role}
                        </span>
                    </div>

                    <div className="h-6 w-px bg-gray-700 hidden sm:block" />

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={logout}
                        className="text-gray-400 hover:text-white hover:bg-gray-800"
                    >
                        <LogOut className="h-4 w-4" />
                        <span className="hidden sm:inline ml-2">Logout</span>
                    </Button>
                </div>
            </div>
        </header>
    );
}
