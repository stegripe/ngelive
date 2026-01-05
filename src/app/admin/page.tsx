"use client";

import {
    Activity,
    ArrowRight,
    Cpu,
    Database,
    Monitor,
    Radio,
    RefreshCw,
    Server,
    Settings,
    Users,
    Video,
    Zap,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { LayoutWrapper } from "@/components/layout/wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading";
import { useStreams } from "@/hooks/useStreams";
import { useUsers } from "@/hooks/useUsers";
import { useVideos } from "@/hooks/useVideos";
import { api } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

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
                    <LoadingSpinner message="Loading admin panel..." />
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
                                        <p className="text-xs sm:text-sm text-gray-400">
                                            {stat.title}
                                        </p>
                                        <p className="text-2xl sm:text-3xl font-bold text-white">
                                            {stat.value}
                                        </p>
                                    </div>
                                    <div
                                        className={cn(
                                            "p-2 sm:p-3 rounded-xl border",
                                            colorClasses[stat.color as keyof typeof colorClasses],
                                        )}
                                    >
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
                                            <p className="text-sm text-gray-400">
                                                Add, edit, or remove users
                                            </p>
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
                                        <p className="font-medium text-white">
                                            Database Management
                                        </p>
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
                                <RefreshCw
                                    className={cn("h-4 w-4", statusLoading && "animate-spin")}
                                />
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Server Status */}
                                <div className="flex items-center gap-3 p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
                                    <div className="relative">
                                        <Server className="h-5 w-5 text-gray-400" />
                                        <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-gray-800 bg-green-500" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-white">Server</p>
                                        <p className="text-xs text-green-400">Online</p>
                                    </div>
                                </div>

                                {/* Database Status */}
                                <div className="flex items-center gap-3 p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
                                    <div className="relative">
                                        <Database className="h-5 w-5 text-gray-400" />
                                        <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-gray-800 bg-green-500" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-white">Database</p>
                                        <p className="text-xs text-green-400">Connected</p>
                                    </div>
                                </div>

                                {/* FFmpeg Status */}
                                <div className="flex items-center gap-3 p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
                                    <div className="relative">
                                        <Radio className="h-5 w-5 text-gray-400" />
                                        <div
                                            className={cn(
                                                "absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-gray-800",
                                                statusLoading && "bg-yellow-500 animate-pulse",
                                                !statusLoading &&
                                                    systemStatus?.ffmpegAvailable &&
                                                    "bg-green-500",
                                                !statusLoading &&
                                                    !systemStatus?.ffmpegAvailable &&
                                                    "bg-red-500",
                                            )}
                                        />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-white">FFmpeg</p>
                                        <p
                                            className={cn(
                                                "text-xs",
                                                statusLoading && "text-yellow-400",
                                                !statusLoading &&
                                                    systemStatus?.ffmpegAvailable &&
                                                    "text-green-400",
                                                !statusLoading &&
                                                    !systemStatus?.ffmpegAvailable &&
                                                    "text-red-400",
                                            )}
                                        >
                                            {statusLoading && "Checking..."}
                                            {!statusLoading &&
                                                systemStatus?.ffmpegAvailable &&
                                                "Ready"}
                                            {!statusLoading &&
                                                !systemStatus?.ffmpegAvailable &&
                                                "Not Available"}
                                        </p>
                                    </div>
                                </div>

                                {/* Memory Status */}
                                <div className="flex items-center gap-3 p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
                                    <div className="relative">
                                        <Cpu className="h-5 w-5 text-gray-400" />
                                        <div
                                            className={cn(
                                                "absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-gray-800",
                                                (systemStatus?.availableMemoryMB ?? 0) > 256
                                                    ? "bg-green-500"
                                                    : "bg-yellow-500",
                                            )}
                                        />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-white">Memory</p>
                                        <p
                                            className={cn(
                                                "text-xs",
                                                (systemStatus?.availableMemoryMB ?? 0) > 256
                                                    ? "text-green-400"
                                                    : "text-yellow-400",
                                            )}
                                        >
                                            {systemStatus?.availableMemoryMB ?? 0} MB Available
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Additional info row */}
                            {systemStatus && (
                                <div className="mt-4 pt-4 border-t border-gray-700/50">
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div className="flex items-center gap-2">
                                            <Activity className="h-4 w-4 text-gray-500" />
                                            <span className="text-gray-400">Active Streams:</span>
                                            <span className="text-white font-medium">
                                                {systemStatus.activeStreams}/
                                                {systemStatus.maxStreams}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Video className="h-4 w-4 text-gray-500" />
                                            <span className="text-gray-400">Quality:</span>
                                            <span className="text-white font-medium capitalize">
                                                {systemStatus.currentQuality}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
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
                            Adjust stream quality based on your server specifications. Lower quality
                            uses less CPU/RAM.
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
                                            : "bg-gray-800/50 border-gray-700/50 text-gray-300 hover:bg-gray-800 hover:border-gray-600",
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
