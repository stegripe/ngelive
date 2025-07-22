"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api";
import { formatDate, formatDuration, formatFileSize } from "@/lib/utils";
import type { Video } from "@/types";
import { Download, Trash2, Video as VideoIcon } from "lucide-react";
import { useState } from "react";

interface VideoListProps {
    videos: Video[];
    onUpdate: () => void;
}

export function VideoList({ videos, onUpdate }: VideoListProps) {
    const [loading, setLoading] = useState<string | null>(null);

    const handleDownload = async (videoId: string) => {
        setLoading(videoId);
        try {
            const response = await api.get(`/videos/${videoId}/download`, {
                responseType: "blob",
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", `video_${videoId}`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Failed to download video:", error);
        } finally {
            setLoading(null);
        }
    };

    const handleDelete = async (videoId: string) => {
        if (confirm("Are you sure you want to delete this video?")) {
            setLoading(videoId);
            try {
                await api.delete(`/videos/${videoId}`);
                onUpdate();
            } catch (error) {
                console.error("Failed to delete video:", error);
            } finally {
                setLoading(null);
            }
        }
    };

    if (videos.length === 0) {
        return (
            <Card className="p-12 text-center">
                <div className="text-gray-400">
                    <VideoIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg mb-2">No videos found</p>
                    <p className="text-sm">Upload your first video to get started</p>
                </div>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {videos.map((video) => (
                <Card key={video.id} className="p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-gray-700 rounded-lg">
                                <VideoIcon className="h-6 w-6 text-gray-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-white">
                                    {video.originalName}
                                </h3>
                                <div className="flex items-center gap-4 text-sm text-gray-400">
                                    <span>Size: {formatFileSize(Number(video.size))}</span>
                                    {video.duration && (
                                        <span>Duration: {formatDuration(video.duration)}</span>
                                    )}
                                    {video.resolution && (
                                        <span>Resolution: {video.resolution}</span>
                                    )}
                                    <span>Format: {video.format}</span>
                                </div>
                                <div className="text-sm text-gray-500 mt-1">
                                    Uploaded: {formatDate(video.uploadedAt)} by{" "}
                                    {video.user?.username}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDownload(video.id)}
                                disabled={loading === video.id}
                                className="flex items-center gap-2"
                            >
                                <Download className="h-4 w-4" />
                                Download
                            </Button>
                            <Button
                                variant="danger"
                                size="sm"
                                onClick={() => handleDelete(video.id)}
                                disabled={loading === video.id}
                                className="flex items-center gap-2"
                            >
                                <Trash2 className="h-4 w-4" />
                                Delete
                            </Button>
                        </div>
                    </div>
                </Card>
            ))}
        </div>
    );
}
