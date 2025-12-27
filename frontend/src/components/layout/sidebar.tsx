"use client";

import { Home, Monitor, Settings, Users, Video } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: Home },
    { name: "Streams", href: "/rtmp", icon: Monitor },
    { name: "Videos", href: "/videos", icon: Video },
];

const adminNavigation = [
    { name: "Users", href: "/admin/users", icon: Users },
    { name: "Settings", href: "/admin", icon: Settings },
];

export function Sidebar() {
    const { user } = useAuth();
    const pathname = usePathname();

    return (
        <div className="fixed inset-y-0 left-0 z-50 w-64 bg-gray-800 border-r border-gray-700 pt-16">
            <div className="flex flex-col h-full">
                <nav className="flex-1 px-4 py-6 space-y-2">
                    {navigation.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;

                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                                    isActive
                                        ? "bg-primary-600 text-white"
                                        : "text-gray-300 hover:bg-gray-700 hover:text-white"
                                )}
                            >
                                <Icon className="h-4 w-4" />
                                {item.name}
                            </Link>
                        );
                    })}

                    {user?.role === "ADMIN" && (
                        <>
                            <div className="my-4 border-t border-gray-700" />
                            <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                                Admin
                            </div>
                            {adminNavigation.map((item) => {
                                const Icon = item.icon;
                                const isActive = pathname === item.href;

                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        className={cn(
                                            "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                                            isActive
                                                ? "bg-primary-600 text-white"
                                                : "text-gray-300 hover:bg-gray-700 hover:text-white"
                                        )}
                                    >
                                        <Icon className="h-4 w-4" />
                                        {item.name}
                                    </Link>
                                );
                            })}
                        </>
                    )}
                </nav>

                <div className="p-4 border-t border-gray-700">
                    <div className="text-xs text-gray-400">RTMP Quota: {user?.rtmpQuota || 0}</div>
                </div>
            </div>
        </div>
    );
}
