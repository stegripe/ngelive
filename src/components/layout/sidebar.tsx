"use client";

import { Home, Monitor, Settings, Users, Video, X, Zap } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
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

interface SidebarProps {
    open: boolean;
    setOpen: (open: boolean) => void;
}

export function Sidebar({ open, setOpen }: SidebarProps) {
    const { user } = useAuth();
    const pathname = usePathname();

    return (
        <>
            {/* Mobile overlay */}
            {open && (
                <button
                    type="button"
                    aria-label="Close sidebar"
                    className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden cursor-default"
                    onClick={() => setOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={cn(
                    "fixed inset-y-0 left-0 z-50 w-72 bg-gray-900 border-r border-gray-800 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:w-64 h-full",
                    open ? "translate-x-0" : "-translate-x-full",
                )}
            >
                <div className="flex flex-col h-full">
                    {/* Mobile header */}
                    <div className="flex items-center justify-between h-16 px-4 border-b border-gray-800 lg:hidden">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
                                <span className="text-white font-bold text-sm">N</span>
                            </div>
                            <span className="text-lg font-bold text-white">ngelive</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setOpen(false)}
                            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 min-h-0 px-3 py-4 space-y-1 overflow-y-auto">
                        <div className="mb-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Menu
                        </div>
                        {navigation.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href;

                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    onClick={() => setOpen(false)}
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                                        isActive
                                            ? "bg-primary-600/20 text-primary-400 border border-primary-500/30"
                                            : "text-gray-400 hover:bg-gray-800 hover:text-white",
                                    )}
                                >
                                    <Icon
                                        className={cn("h-5 w-5", isActive && "text-primary-400")}
                                    />
                                    {item.name}
                                </Link>
                            );
                        })}

                        {user?.role === "ADMIN" && (
                            <>
                                <div className="my-4 border-t border-gray-800" />
                                <div className="mb-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Admin
                                </div>
                                {adminNavigation.map((item) => {
                                    const Icon = item.icon;
                                    let isActive = false;
                                    if (item.href === "/admin/users") {
                                        isActive =
                                            pathname === "/admin/users" ||
                                            pathname.startsWith("/admin/users/");
                                    } else if (item.href === "/admin") {
                                        isActive = pathname === "/admin";
                                    }
                                    return (
                                        <Link
                                            key={item.name}
                                            href={item.href}
                                            onClick={() => setOpen(false)}
                                            className={cn(
                                                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                                                isActive
                                                    ? "bg-primary-600/20 text-primary-400 border border-primary-500/30"
                                                    : "text-gray-400 hover:bg-gray-800 hover:text-white",
                                            )}
                                        >
                                            <Icon
                                                className={cn(
                                                    "h-5 w-5",
                                                    isActive && "text-primary-400",
                                                )}
                                            />
                                            {item.name}
                                        </Link>
                                    );
                                })}
                            </>
                        )}
                    </nav>

                    {/* Footer with quota - always at the very bottom, never floats up */}
                    <div className="p-4 border-t border-gray-800 flex-shrink-0">
                        <div className="p-3 bg-gray-800/50 rounded-lg mb-3 min-h-[64px] flex flex-col justify-center">
                            <div className="flex items-center gap-2 mb-2">
                                <Zap className="h-4 w-4 text-yellow-500" />
                                <span className="text-xs font-semibold text-gray-300">
                                    RTMP Quota
                                </span>
                            </div>
                            <div className="flex items-baseline gap-1">
                                {user?.rtmpQuota === -1 || user?.role === "ADMIN" ? (
                                    <>
                                        <span className="text-lg font-bold text-yellow-400">∞</span>
                                        <span className="text-xs text-gray-500">Unlimited</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="text-2xl font-bold text-white tabular-nums">
                                            {typeof user?.rtmpQuota === "number" ? (
                                                user.rtmpQuota
                                            ) : (
                                                <span className="opacity-50">0</span>
                                            )}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                            streams available
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                        {/* Watermark */}
                        <div className="text-center">
                            <p className="text-[10px] text-gray-600">
                                <span className="font-semibold text-gray-500">ngelive</span> by{" "}
                                <a
                                    href="https://stegripe.org"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary-500/70 hover:text-primary-400 transition-colors"
                                >
                                    Stegripe Development
                                </a>
                            </p>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
}
