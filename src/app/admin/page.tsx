"use client";

import { LayoutWrapper } from "@/components/layout/wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStreams } from "@/hooks/useStreams";
import { useUsers } from "@/hooks/useUsers";
import { useVideos } from "@/hooks/useVideos";
import { api } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { Activity, ArrowRight, Check, Cpu, Database, HardDrive, Monitor, Radio, RefreshCw, Server, Settings, Users, Video, X, Zap } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";

interface SystemStatus {
    activeStreams: number;
    maxStreams: number;
    availableMemoryMB: number;
    currentQuality: string;
    ffmpegAvailable: boolean;
    timestamp: string;
}

const qualityLabels: Record<string, string> = {
    ultralow: "Ultra Low (480p)",
    low: "Low (720p)",
    medium: "Medium (720p HQ)",
    high: "High (1080p)",
};

export default function AdminPage() {
    const { user } = useAuth();
    const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
    const [statusLoading, setStatusLoading] = useState(false);
    const [changingQuality, setChangingQuality] = useState(false);

    // React Query hooks
    const { data: users = [], isLoading: usersLoading } = useUsers();
    const { data: streams = [], isLoading: streamsLoading } = useStreams();
    const { data: videos = [], isLoading: videosLoading } = useVideos();

    const fetchSystemStatus = useCallback(async () => {
        try {
            setStatusLoading(true);
            const response = await api.get("/system/status");
            setSystemStatus(response.data.data.status);
        } catch (error) {
            console.error("Error fetching system status:", error);
        } finally {
            setStatusLoading(false);
        }
    }, []);

    const changeQuality = async (quality: string) => {
        try {
            setChangingQuality(true);
            await api.put("/system/status", { quality });
            await fetchSystemStatus();
        } catch (error) {
            console.error("Error changing quality:", error);
        } finally {
            setChangingQuality(false);
        }
    };

    useEffect(() => {
        if (user?.role !== "ADMIN") {
            window.location.href = "/dashboard";
            return;
        }
        fetchSystemStatus();
    }, [user, fetchSystemStatus]);

    const stats = {
        users: users.length,
        totalStreams: streams.length,
        totalVideos: videos.length,
        activeStreams: streams.filter((s: { isStreaming: boolean }) => s.isStreaming).length,
    };

    const loading = usersLoading || streamsLoading || videosLoading;

    if (loading) {
        return (
            <LayoutWrapper>
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <div className="relative">
                            <div className="w-12 h-12 border-4 border-gray-700 rounded-full" />
                            <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin absolute inset-0" />
                        </div>
                        <p className="mt-4 text-gray-400">Loading admin panel...</p>
                    </div>
                </div>
            </LayoutWrapper>
        );
    }

    const statCards = [
        {
            title: "Active Streams",
            value: stats.activeStreams,
            icon: Activity,
            color: "green",
        },
        {
            title: "Total Streams",
            value: stats.totalStreams,
            icon: Monitor,
            color: "blue",
        },
        {
            title: "Total Videos",
            value: stats.totalVideos,
            icon: Video,
            color: "yellow",
        },
        {
            title: "Total Users",
            value: stats.users,
            icon: Users,
            color: "purple",
        },
    ];

    const colorClasses = {
        green: "bg-green-500/10 text-green-400 border-green-500/20",
        blue: "bg-primary-500/10 text-primary-400 border-primary-500/20",
        yellow: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
        purple: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    };

    const systemStatusItems = [
        { 
            name: "Database", 
            status: "Online", 
            icon: Database,
            ok: true 
        },
        { 
            name: "FFmpeg", 
            status: systemStatus?.ffmpegAvailable ? "Available" : "Not Found", 
            icon: Server,
            ok: systemStatus?.ffmpegAvailable ?? false 
        },
        { 
            name: "Active Streams", 
            status: `${systemStatus?.activeStreams ?? 0}/${systemStatus?.maxStreams ?? 2}`, 
            icon: Radio,
            ok: true 
        },
        { 
            name: "Memory", 
            status: `${systemStatus?.availableMemoryMB ?? 0} MB`, 
            icon: Cpu,
            ok: (systemStatus?.availableMemoryMB ?? 0) > 256 
        },
    ];

    return (
        <LayoutWrapper>
            <div className="space-y-6 sm:space-y-8">
                {/* Header */}
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-white">Admin Panel</h1>
                    <p className="text-gray-400 mt-1">System management and configuration</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                    {statCards.map((stat) => {
                        const Icon = stat.icon;
                        return (
                            <Card key={stat.title} className="p-4 sm:p-6">
                                <div className="flex items-start justify-between">
                                    <div className="space-y-2">
                                        <p className="text-xs sm:text-sm text-gray-400">{stat.title}</p>
                                        <p className="text-2xl sm:text-3xl font-bold text-white">
                                            {stat.value}
                                        </p>
                                    </div>
                                    <div className={cn(
                                        "p-2 sm:p-3 rounded-xl border",
                                        colorClasses[stat.color as keyof typeof colorClasses]
                                    )}>
                                        <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Quick Actions */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Quick Actions</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <Link href="/admin/users" className="block">
                                <div className="flex items-center justify-between p-4 bg-gray-800/50 hover:bg-gray-800 rounded-lg border border-gray-700/50 transition-all duration-200 group">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
                                            <Users className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-white">Manage Users</p>
                                            <p className="text-sm text-gray-400">Add, edit, or remove users</p>
                                        </div>
                                    </div>
                                    <ArrowRight className="h-5 w-5 text-gray-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
                                </div>
                            </Link>
                            <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg border border-gray-700/50 opacity-50 cursor-not-allowed">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-gray-500/10 rounded-lg text-gray-400">
                                        <Settings className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-white">System Settings</p>
                                        <p className="text-sm text-gray-400">Coming soon</p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg border border-gray-700/50 opacity-50 cursor-not-allowed">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-gray-500/10 rounded-lg text-gray-400">
                                        <Database className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-white">Database Management</p>
                                        <p className="text-sm text-gray-400">Coming soon</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* System Status */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>System Status</CardTitle>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={fetchSystemStatus}
                                disabled={statusLoading}
                                className="text-gray-400 hover:text-white"
                            >
                                <RefreshCw className={cn("h-4 w-4", statusLoading && "animate-spin")} />
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {systemStatusItems.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <div
                                        key={item.name}
                                        className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg border border-gray-700/50"
                                    >
                                        <div className="flex items-center gap-3">
                                            <Icon className="h-5 w-5 text-gray-400" />
                                            <span className="text-white">{item.name}</span>
                                        </div>
                                        <span className={cn(
                                            "inline-flex items-center gap-1.5 text-sm px-2.5 py-1 rounded-full border",
                                            item.ok 
                                                ? "text-green-400 bg-green-500/10 border-green-500/20"
                                                : "text-red-400 bg-red-500/10 border-red-500/20"
                                        )}>
                                            {item.ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                                            {item.status}
                                        </span>
                                    </div>
                                );
                            })}
                        </CardContent>
                    </Card>
                </div>

                {/* Stream Quality Settings */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Zap className="h-5 w-5 text-yellow-400" />
                            Stream Quality Settings
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-gray-400 mb-4">
                            Adjust stream quality based on your server specifications. Lower quality uses less CPU/RAM.
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {Object.entries(qualityLabels).map(([key, label]) => (
                                <button
                                    type="button"
                                    key={key}
                                    onClick={() => changeQuality(key)}
                                    disabled={changingQuality}
                                    className={cn(
                                        "p-4 rounded-lg border transition-all text-left",
                                        systemStatus?.currentQuality === key
                                            ? "bg-primary-500/20 border-primary-500/50 text-primary-400"
                                            : "bg-gray-800/50 border-gray-700/50 text-gray-300 hover:bg-gray-800 hover:border-gray-600"
                                    )}
                                >
                                    <p className="font-medium text-sm">{label}</p>
                                    <p className="text-xs mt-1 text-gray-500">
                                        {key === "ultralow" && "512MB RAM"}
                                        {key === "low" && "1GB RAM"}
                                        {key === "medium" && "2GB RAM"}
                                        {key === "high" && "4GB+ RAM"}
                                    </p>
                                </button>
                            ))}
                        </div>
                        {changingQuality && (
                            <p className="text-sm text-gray-400 mt-3 flex items-center gap-2">
                                <RefreshCw className="h-4 w-4 animate-spin" />
                                Updating quality settings...
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </LayoutWrapper>
    );
}
