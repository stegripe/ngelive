"use client";

import {
    Calendar,
    Film,
    HardDrive,
    Play,
    Plus,
    Search,
    Shield,
    Trash2,
    User,
    Video as VideoIcon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { LayoutWrapper } from "@/components/layout/wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/loading";
import { UploadVideo } from "@/components/video/upload-video";
import { VideoPlayer } from "@/components/video/video-player";
import { api } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { formatDate } from "@/lib/utils";
import { type Video } from "@/types";

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
        video.originalName.toLowerCase().includes(searchTerm.toLowerCase()),
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
                    <LoadingSpinner message="Loading videos..." />
                </div>
            </LayoutWrapper>
        );
    }

    return (
        <LayoutWrapper>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-2xl sm:text-3xl font-bold text-white">
                                {pageInfo.title}
                            </h1>
                            {user?.role === "ADMIN" && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-500/20 rounded-full text-xs text-purple-400 border border-purple-500/30">
                                    <Shield className="h-3 w-3" />
                                    Admin View
                                </span>
                            )}
                        </div>
                        <p className="text-gray-400 mt-1">{pageInfo.description}</p>
                    </div>
                    <Button onClick={() => setShowUploadModal(true)} className="w-full sm:w-auto">
                        <Plus className="h-4 w-4" />
                        Upload Video
                    </Button>
                </div>

                {/* Search & Filter */}
                <Card className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                            <Input
                                placeholder="Search videos..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                            <Film className="h-4 w-4" />
                            <span>
                                {filteredVideos.length} of {videos.length} videos
                            </span>
                        </div>
                    </div>
                </Card>

                {filteredVideos.length === 0 ? (
                    <Card className="p-8 sm:p-12">
                        <div className="text-center">
                            <div className="w-20 h-20 mx-auto mb-6 bg-gray-800 rounded-full flex items-center justify-center">
                                <VideoIcon className="h-10 w-10 text-gray-600" />
                            </div>
                            {user?.role === "ADMIN" ? (
                                <>
                                    <p className="text-lg font-medium text-white mb-2">
                                        No videos in the system
                                    </p>
                                    <p className="text-gray-400">
                                        Users haven&apos;t uploaded any videos yet
                                    </p>
                                </>
                            ) : (
                                <>
                                    <p className="text-lg font-medium text-white mb-2">
                                        No videos found
                                    </p>
                                    <p className="text-gray-400 mb-6">
                                        Upload your first video to get started
                                    </p>
                                    <Button onClick={() => setShowUploadModal(true)}>
                                        <Plus className="h-4 w-4" />
                                        Upload Video
                                    </Button>
                                </>
                            )}
                        </div>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                        {filteredVideos.map((video) => (
                            <Card key={video.id} className="overflow-hidden group">
                                <button
                                    type="button"
                                    className="aspect-video bg-gray-800 flex items-center justify-center cursor-pointer relative overflow-hidden w-full"
                                    onClick={() => handlePlayVideo(video)}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="flex items-center justify-center w-14 h-14 bg-white/10 backdrop-blur-sm rounded-full group-hover:bg-primary-500 group-hover:scale-110 transition-all">
                                        <Play className="h-7 w-7 text-white ml-1" />
                                    </div>
                                </button>

                                <CardContent className="p-4 space-y-3">
                                    <h3
                                        className="font-semibold text-white truncate"
                                        title={video.originalName}
                                    >
                                        {video.originalName}
                                    </h3>

                                    <div className="flex flex-wrap gap-2">
                                        <span className="inline-flex items-center gap-1.5 text-xs text-gray-400 bg-gray-800/50 px-2 py-1 rounded">
                                            <User className="h-3 w-3" />
                                            {video.user.username}
                                            {video.user.id === user?.id && (
                                                <span className="text-primary-400">(You)</span>
                                            )}
                                        </span>
                                        <span className="inline-flex items-center gap-1.5 text-xs text-gray-400 bg-gray-800/50 px-2 py-1 rounded">
                                            <HardDrive className="h-3 w-3" />
                                            {(Number(video.size) / 1024 / 1024).toFixed(1)} MB
                                        </span>
                                    </div>

                                    <div className="flex items-center text-xs text-gray-500">
                                        <Calendar className="h-3 w-3 mr-1.5" />
                                        {formatDate(video.uploadedAt)}
                                    </div>

                                    <div className="flex gap-2 pt-2 border-t border-gray-700/50">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handlePlayVideo(video)}
                                            className="flex-1"
                                        >
                                            <Play className="h-3 w-3" />
                                            Play
                                        </Button>

                                        {(video.user.id === user?.id || user?.role === "ADMIN") && (
                                            <Button
                                                variant="danger"
                                                size="sm"
                                                onClick={() => handleDeleteVideo(video.id)}
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
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
