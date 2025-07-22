"use client";

import { LayoutWrapper } from "@/components/layout/wrapper";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { UploadVideo } from "@/components/video/upload-video";
import { VideoPlayer } from "@/components/video/video-player";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import type { Video } from "@/types";
import { Calendar, HardDrive, Play, Plus, Search, Shield, Trash2, User } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export default function VideosPage() {
    const { user } = useAuth();
    const [videos, setVideos] = useState<Video[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);

    const fetchVideos = useCallback(async () => {
        try {
            setLoading(true);
            const response = await api.get("/videos");
            setVideos(response.data.data.videos || []);
        } catch (error) {
            console.error("Error fetching videos:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchVideos();
    }, [fetchVideos]);

    const handleDeleteVideo = async (videoId: string) => {
        if (confirm("Are you sure you want to delete this video?")) {
            try {
                await api.delete(`/videos/${videoId}`);
                fetchVideos();
            } catch (error) {
                console.error("Error deleting video:", error);
            }
        }
    };

    const handlePlayVideo = (video: Video) => {
        setSelectedVideo(video);
    };

    const filteredVideos = videos.filter((video) =>
        video.originalName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Get page title and description based on user role
    const getPageInfo = () => {
        if (user?.role === "ADMIN") {
            return {
                title: "All Videos",
                description: "Manage all user videos in the system",
            };
        }
        return {
            title: "My Videos",
            description: "Manage your personal video library",
        };
    };

    const pageInfo = getPageInfo();

    if (loading) {
        return (
            <LayoutWrapper>
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4" />
                        <p className="text-gray-400">Loading videos...</p>
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
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold text-white">{pageInfo.title}</h1>
                            {user?.role === "ADMIN" && (
                                <div className="flex items-center gap-1 px-2 py-1 bg-purple-500/20 rounded-full">
                                    <Shield className="h-3 w-3 text-purple-400" />
                                    <span className="text-xs text-purple-400">Admin View</span>
                                </div>
                            )}
                        </div>
                        <p className="text-gray-400">{pageInfo.description}</p>
                    </div>
                    <Button
                        onClick={() => setShowUploadModal(true)}
                        className="flex items-center gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        Upload Video
                    </Button>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Search videos..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    {user?.role === "ADMIN" && (
                        <div className="text-sm text-gray-400">
                            Showing {filteredVideos.length} of {videos.length} videos
                        </div>
                    )}
                </div>

                {filteredVideos.length === 0 ? (
                    <Card className="p-12 text-center">
                        <div className="text-gray-400">
                            <Play className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            {user?.role === "ADMIN" ? (
                                <>
                                    <p className="text-lg mb-2">No videos in the system</p>
                                    <p className="text-sm">Users haven't uploaded any videos yet</p>
                                </>
                            ) : (
                                <>
                                    <p className="text-lg mb-2">No videos found</p>
                                    <p className="text-sm">
                                        Upload your first video to get started
                                    </p>
                                </>
                            )}
                        </div>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredVideos.map((video) => (
                            <Card key={video.id} className="p-4">
                                <button
                                    type="button"
                                    className="aspect-video bg-gray-700 rounded-lg mb-4 flex items-center justify-center cursor-pointer hover:bg-gray-600 transition-colors group"
                                    onClick={() => handlePlayVideo(video)}
                                >
                                    <div className="flex items-center justify-center w-12 h-12 bg-white/10 rounded-full group-hover:bg-white/20 transition-colors">
                                        <Play className="h-6 w-6 text-white ml-1" />
                                    </div>
                                </button>

                                <div className="space-y-2">
                                    <h3 className="font-semibold text-white truncate">
                                        {video.originalName}
                                    </h3>

                                    <div className="flex items-center gap-2 text-sm text-gray-400">
                                        <User className="h-3 w-3" />
                                        <span>{video.user.username}</span>
                                        {video.user.id === user?.id && (
                                            <span className="text-xs bg-blue-500/20 text-blue-400 px-1 py-0.5 rounded">
                                                You
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2 text-sm text-gray-400">
                                        <Calendar className="h-3 w-3" />
                                        {formatDate(video.uploadedAt)}
                                    </div>

                                    <div className="flex items-center gap-2 text-sm text-gray-400">
                                        <HardDrive className="h-3 w-3" />
                                        {(Number(video.size) / 1024 / 1024).toFixed(1)} MB
                                    </div>
                                </div>

                                <div className="flex gap-2 mt-4">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handlePlayVideo(video)}
                                        className="flex items-center gap-1"
                                    >
                                        <Play className="h-3 w-3" />
                                        Play
                                    </Button>

                                    {(video.user.id === user?.id || user?.role === "ADMIN") && (
                                        <Button
                                            variant="danger"
                                            size="sm"
                                            onClick={() => handleDeleteVideo(video.id)}
                                            className="flex items-center gap-1"
                                        >
                                            <Trash2 className="h-3 w-3" />
                                            Delete
                                        </Button>
                                    )}
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            <UploadVideo
                isOpen={showUploadModal}
                onClose={() => setShowUploadModal(false)}
                onSuccess={() => {
                    fetchVideos();
                    setShowUploadModal(false);
                }}
            />

            <VideoPlayer
                isOpen={!!selectedVideo}
                onClose={() => setSelectedVideo(null)}
                videoId={selectedVideo?.id || ""}
                title={selectedVideo?.originalName || ""}
            />
        </LayoutWrapper>
    );
}
