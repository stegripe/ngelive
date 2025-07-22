"use client";

import { LayoutWrapper } from "@/components/layout/wrapper";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useStreams } from "@/hooks/useStreams";
import { useUsers } from "@/hooks/useUsers";
import { useVideos } from "@/hooks/useVideos";
import { useAuth } from "@/lib/auth";
import { Activity, Clock, Monitor, Plus, User, Users, Video } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
    const { user } = useAuth();

    // React Query hooks
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
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4" />
                        <p className="text-gray-400">Loading dashboard...</p>
                    </div>
                </div>
            </LayoutWrapper>
        );
    }

    return (
        <LayoutWrapper>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
                        <p className="text-gray-400">Welcome back, {user?.username}!</p>
                    </div>
                    <Link href="/rtmp">
                        <Button className="flex items-center gap-2">
                            <Plus className="h-4 w-4" />
                            New Stream
                        </Button>
                    </Link>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-green-500/20 rounded-lg">
                                <Activity className="h-6 w-6 text-green-500" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-400">Active Streams</p>
                                <p className="text-2xl font-bold text-white">
                                    {stats.activeStreams}
                                </p>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-red-500/20 rounded-lg">
                                <Monitor className="h-6 w-6 text-red-500" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-400">Total Streams</p>
                                <p className="text-2xl font-bold text-white">{stats.streams}</p>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-yellow-500/20 rounded-lg">
                                <Video className="h-6 w-6 text-yellow-500" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-400">Videos</p>
                                <p className="text-2xl font-bold text-white">{stats.videos}</p>
                            </div>
                        </div>
                    </Card>

                    {user?.role === "ADMIN" && (
                        <Card className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-purple-500/20 rounded-lg">
                                    <Users className="h-6 w-6 text-purple-500" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-400">Users</p>
                                    <p className="text-2xl font-bold text-white">{stats.users}</p>
                                </div>
                            </div>
                        </Card>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Quick Actions */}
                    <Card className="p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
                        <div className="flex flex-col gap-3">
                            <Link href="/rtmp">
                                <Button variant="outline" className="w-full justify-start">
                                    <Monitor className="h-4 w-4 mr-2" />
                                    Manage Streams
                                </Button>
                            </Link>
                            <Link href="/videos">
                                <Button variant="outline" className="w-full justify-start">
                                    <Video className="h-4 w-4 mr-2" />
                                    Upload Videos
                                </Button>
                            </Link>
                            {user?.role === "ADMIN" && (
                                <Link href="/admin">
                                    <Button variant="outline" className="w-full justify-start">
                                        <Users className="h-4 w-4 mr-2" />
                                        User Management
                                    </Button>
                                </Link>
                            )}
                        </div>
                    </Card>

                    {/* Recent Videos */}
                    <Card className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-white">Recent Videos</h3>
                            <Link href="/videos">
                                <Button variant="ghost" size="sm">
                                    View All
                                </Button>
                            </Link>
                        </div>
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
                                            className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg"
                                        >
                                            <div className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center">
                                                <Video className="h-5 w-5 text-gray-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-white truncate">
                                                    {video.originalName}
                                                </p>
                                                <div className="flex items-center gap-3 text-xs text-gray-400">
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
                                <div className="text-center py-8 text-gray-400">
                                    <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                    <p>No videos yet</p>
                                    <p className="text-sm">
                                        Upload your first video to get started
                                    </p>
                                </div>
                            )}
                        </div>
                    </Card>
                </div>

                {/* System Status */}
                <Card className="p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">System Status</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-3 h-3 bg-green-500 rounded-full" />
                            <span className="text-sm text-gray-300">Server Online</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-3 h-3 bg-green-500 rounded-full" />
                            <span className="text-sm text-gray-300">Database Connected</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-3 h-3 bg-green-500 rounded-full" />
                            <span className="text-sm text-gray-300">RTMP Server Ready</span>
                        </div>
                    </div>
                </Card>
            </div>
        </LayoutWrapper>
    );
}
