"use client";

import { LayoutWrapper } from "@/components/layout/wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStreams } from "@/hooks/useStreams";
import { useUsers } from "@/hooks/useUsers";
import { useVideos } from "@/hooks/useVideos";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { Activity, ArrowRight, Clock, Monitor, Plus, Server, User, Users, Video, Database, Radio } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
    const { user } = useAuth();

    const { data: streams = [], isLoading: streamsLoading } = useStreams();
    const { data: videos = [], isLoading: videosLoading } = useVideos();
    const { data: users = [], isLoading: usersLoading } = useUsers();

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const stats = {
        streams: streams.length,
        videos: videos.length,
        users: users.length,
        activeStreams: streams.filter((s: { isStreaming: boolean }) => s.isStreaming).length,
    };

    const recentVideos = videos.slice(0, 5);
    const loading = streamsLoading || videosLoading || (user?.role === "ADMIN" && usersLoading);

    if (loading) {
        return (
            <LayoutWrapper>
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <div className="relative">
                            <div className="w-12 h-12 border-4 border-gray-700 rounded-full" />
                            <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin absolute inset-0" />
                        </div>
                        <p className="mt-4 text-gray-400">Loading dashboard...</p>
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
            show: true,
        },
        {
            title: "Total Streams",
            value: stats.streams,
            icon: Monitor,
            color: "blue",
            show: true,
        },
        {
            title: "Videos",
            value: stats.videos,
            icon: Video,
            color: "yellow",
            show: true,
        },
        {
            title: "Users",
            value: stats.users,
            icon: Users,
            color: "purple",
            show: user?.role === "ADMIN",
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
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-white">Dashboard</h1>
                        <p className="text-gray-400 mt-1">Welcome back, {user?.username}!</p>
                    </div>
                    <Link href="/rtmp">
                        <Button className="w-full sm:w-auto">
                            <Plus className="h-4 w-4" />
                            New Stream
                        </Button>
                    </Link>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                    {statCards.filter(s => s.show).map((stat) => {
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
                            <Link href="/rtmp" className="block">
                                <div className="flex items-center justify-between p-4 bg-gray-800/50 hover:bg-gray-800 rounded-lg border border-gray-700/50 transition-all duration-200 group">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-primary-500/10 rounded-lg text-primary-400">
                                            <Monitor className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-white">Manage Streams</p>
                                            <p className="text-sm text-gray-400">View and control your RTMP streams</p>
                                        </div>
                                    </div>
                                    <ArrowRight className="h-5 w-5 text-gray-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
                                </div>
                            </Link>
                            <Link href="/videos" className="block">
                                <div className="flex items-center justify-between p-4 bg-gray-800/50 hover:bg-gray-800 rounded-lg border border-gray-700/50 transition-all duration-200 group">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-yellow-500/10 rounded-lg text-yellow-400">
                                            <Video className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-white">Upload Videos</p>
                                            <p className="text-sm text-gray-400">Add new videos to your library</p>
                                        </div>
                                    </div>
                                    <ArrowRight className="h-5 w-5 text-gray-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
                                </div>
                            </Link>
                            {user?.role === "ADMIN" && (
                                <Link href="/admin/users" className="block">
                                    <div className="flex items-center justify-between p-4 bg-gray-800/50 hover:bg-gray-800 rounded-lg border border-gray-700/50 transition-all duration-200 group">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
                                                <Users className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-white">User Management</p>
                                                <p className="text-sm text-gray-400">Manage users and permissions</p>
                                            </div>
                                        </div>
                                        <ArrowRight className="h-5 w-5 text-gray-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
                                    </div>
                                </Link>
                            )}
                        </CardContent>
                    </Card>

                    {/* Recent Videos */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Recent Videos</CardTitle>
                            <Link href="/videos">
                                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                                    View All
                                    <ArrowRight className="h-4 w-4 ml-1" />
                                </Button>
                            </Link>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {recentVideos.length > 0 ? (
                                    recentVideos.map(
                                        (video: {
                                            id: string;
                                            originalName: string;
                                            uploadedAt: string;
                                            user: { username: string };
                                        }) => (
                                            <div
                                                key={video.id}
                                                className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700/50 hover:bg-gray-800 transition-colors"
                                            >
                                                <div className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                                                    <Video className="h-5 w-5 text-gray-400" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-white truncate">
                                                        {video.originalName}
                                                    </p>
                                                    <div className="flex items-center gap-3 text-xs text-gray-500">
                                                        <span className="flex items-center gap-1">
                                                            <User className="h-3 w-3" />
                                                            {video.user.username}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="h-3 w-3" />
                                                            {formatDate(video.uploadedAt)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    )
                                ) : (
                                    <div className="text-center py-8">
                                        <div className="w-16 h-16 mx-auto mb-4 bg-gray-800 rounded-full flex items-center justify-center">
                                            <Video className="h-8 w-8 text-gray-600" />
                                        </div>
                                        <p className="text-gray-400 font-medium">No videos yet</p>
                                        <p className="text-sm text-gray-500 mt-1">
                                            Upload your first video to get started
                                        </p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* System Status */}
                <Card>
                    <CardHeader>
                        <CardTitle>System Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {[
                                { name: "Server", icon: Server, status: "Online" },
                                { name: "Database", icon: Database, status: "Connected" },
                                { name: "RTMP Server", icon: Radio, status: "Ready" },
                            ].map((item) => {
                                const Icon = item.icon;
                                return (
                                    <div
                                        key={item.name}
                                        className="flex items-center gap-3 p-4 bg-gray-800/50 rounded-lg border border-gray-700/50"
                                    >
                                        <div className="relative">
                                            <Icon className="h-5 w-5 text-gray-400" />
                                            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-gray-800" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-white">{item.name}</p>
                                            <p className="text-xs text-green-400">{item.status}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </LayoutWrapper>
    );
}
