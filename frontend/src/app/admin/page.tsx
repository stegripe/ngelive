"use client";

import { LayoutWrapper } from "@/components/layout/wrapper";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useStreams } from "@/hooks/useStreams";
import { useUsers } from "@/hooks/useUsers";
import { useVideos } from "@/hooks/useVideos";
import { useAuth } from "@/lib/auth";
import { Activity, Database, Monitor, Settings, Users, Video } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

export default function AdminPage() {
    const { user } = useAuth();

    // React Query hooks
    const { data: users = [], isLoading: usersLoading } = useUsers();
    const { data: streams = [], isLoading: streamsLoading } = useStreams();
    const { data: videos = [], isLoading: videosLoading } = useVideos();

    useEffect(() => {
        if (user?.role !== "ADMIN") {
            window.location.href = "/dashboard";
            return;
        }
    }, [user]);

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
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4" />
                        <p className="text-gray-400">Loading admin panel...</p>
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
                        <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
                        <p className="text-gray-400">System management and configuration</p>
                    </div>
                </div>

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
                                <p className="text-2xl font-bold text-white">
                                    {stats.totalStreams}
                                </p>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-yellow-500/20 rounded-lg">
                                <Video className="h-6 w-6 text-yellow-500" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-400">Total Videos</p>
                                <p className="text-2xl font-bold text-white">{stats.totalVideos}</p>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-purple-500/20 rounded-lg">
                                <Users className="h-6 w-6 text-purple-500" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-400">Total Users</p>
                                <p className="text-2xl font-bold text-white">{stats.users}</p>
                            </div>
                        </div>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
                        <div className="space-y-3">
                            <Link href="/admin/users">
                                <Button variant="outline" className="w-full justify-start">
                                    <Users className="h-4 w-4 mr-2" />
                                    Manage Users
                                </Button>
                            </Link>
                            <Button variant="outline" className="w-full justify-start">
                                <Settings className="h-4 w-4 mr-2" />
                                System Settings
                            </Button>
                            <Button variant="outline" className="w-full justify-start">
                                <Database className="h-4 w-4 mr-2" />
                                Database Management
                            </Button>
                        </div>
                    </Card>

                    <Card className="p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">System Status</h3>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-gray-400">Database</span>
                                <span className="text-green-400">Online</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-400">RTMP Service</span>
                                <span className="text-green-400">Running</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-400">FFmpeg</span>
                                <span className="text-green-400">Available</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-400">Storage</span>
                                <span className="text-yellow-400">Unknown</span>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </LayoutWrapper>
    );
}
