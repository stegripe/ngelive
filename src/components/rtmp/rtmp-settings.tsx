"use client";

import {
    ArrowDown,
    ArrowUp,
    List,
    Play,
    Plus,
    Save,
    Search,
    Settings,
    Trash2,
    Video,
    X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useUpdateStream } from "@/hooks/useStreams";
import {
    useAddVideoToStream,
    useRemoveVideoFromStream,
    useReorderStreamVideos,
} from "@/hooks/useStreamVideos";
import { useVideos } from "@/hooks/useVideos";
import { toastManager } from "@/lib/toast-manager";

interface RtmpSettingsProps {
    isOpen: boolean;
    onClose: () => void;
    stream: {
        id: string;
        name: string;
        rtmpUrl: string;
        playlistMode: string;
        isActive: boolean;
        streamVideos?: StreamVideo[];
    };
    onUpdate: () => void;
}

interface StreamVideo {
    id: string;
    video: {
        id: string;
        originalName: string;
        size: number;
        user: {
            username: string;
        };
    };
}

export function RtmpSettings({ isOpen, onClose, stream, onUpdate }: RtmpSettingsProps) {
    const [activeTab, setActiveTab] = useState("info");
    const [searchTerm, setSearchTerm] = useState("");
    const [streamVideos, setStreamVideos] = useState<StreamVideo[]>([]);

    // Stream info form
    const [streamInfo, setStreamInfo] = useState({
        name: "",
        rtmpUrl: "",
        playlistMode: "LOOP",
    });

    // React Query hooks
    const { data: availableVideos = [] } = useVideos();
    const updateStreamMutation = useUpdateStream();
    const addVideoMutation = useAddVideoToStream();
    const removeVideoMutation = useRemoveVideoFromStream();
    const reorderVideosMutation = useReorderStreamVideos();

    useEffect(() => {
        if (isOpen) {
            setStreamVideos(stream.streamVideos || []);
            setStreamInfo({
                name: stream.name,
                rtmpUrl: stream.rtmpUrl,
                playlistMode: stream.playlistMode,
            });
        }
    }, [isOpen, stream]);

    const handleClose = () => {
        // Clear any stream-related toasts when closing modal
        toastManager.clear();
        onClose();
    };

    const handleUpdateStreamInfo = (e: React.FormEvent) => {
        e.preventDefault();
        updateStreamMutation.mutate(
            { id: stream.id, data: streamInfo },
            {
                onSuccess: () => {
                    onUpdate();
                    handleClose();
                },
            },
        );
    };

    const handleAddVideo = (video: StreamVideo["video"]) => {
        addVideoMutation.mutate({ streamId: stream.id, videoId: video.id });
    };

    const handleRemoveVideo = (streamVideoId: string) => {
        removeVideoMutation.mutate({ streamId: stream.id, videoId: streamVideoId });
    };

    const handleMoveVideo = (index: number, direction: "up" | "down") => {
        const newVideos = [...streamVideos];
        const targetIndex = direction === "up" ? index - 1 : index + 1;

        if (targetIndex < 0 || targetIndex >= newVideos.length) {
            return;
        }

        [newVideos[index], newVideos[targetIndex]] = [newVideos[targetIndex], newVideos[index]];

        // Update local state optimistically
        setStreamVideos(newVideos);

        reorderVideosMutation.mutate({
            streamId: stream.id,
            videoOrders: newVideos.map((sv, idx) => ({
                id: sv.id,
                order: idx,
            })),
        });
    };

    const filteredVideos = availableVideos.filter(
        (video: StreamVideo["video"]) =>
            video.originalName.toLowerCase().includes(searchTerm.toLowerCase()) &&
            !streamVideos.some((sv) => sv.video.id === video.id),
    );

    if (!isOpen) {
        return null;
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-semibold text-white">
                            Stream Settings: {stream.name}
                        </h2>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleClose}
                            className="text-gray-400 hover:text-white"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Tabs */}
                    <div className="flex space-x-1 mb-6">
                        <button
                            type="button"
                            onClick={() => setActiveTab("info")}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                activeTab === "info"
                                    ? "bg-blue-600 text-white"
                                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                            }`}
                        >
                            <Settings className="h-4 w-4" />
                            Stream Info
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab("videos")}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                activeTab === "videos"
                                    ? "bg-blue-600 text-white"
                                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                            }`}
                        >
                            <List className="h-4 w-4" />
                            Video Management
                        </button>
                    </div>

                    {/* Stream Info Tab */}
                    {activeTab === "info" && (
                        <Card className="p-6">
                            <form onSubmit={handleUpdateStreamInfo} className="space-y-4">
                                <div>
                                    <label
                                        htmlFor="stream-name"
                                        className="block text-sm font-medium text-gray-300 mb-2"
                                    >
                                        Stream Name
                                    </label>
                                    <Input
                                        id="stream-name"
                                        value={streamInfo.name}
                                        onChange={(e) =>
                                            setStreamInfo({ ...streamInfo, name: e.target.value })
                                        }
                                        placeholder="Enter stream name"
                                        required
                                        className="w-full"
                                    />
                                </div>

                                <div>
                                    <label
                                        htmlFor="rtmp-url"
                                        className="block text-sm font-medium text-gray-300 mb-2"
                                    >
                                        RTMP URL
                                    </label>
                                    <Input
                                        id="rtmp-url"
                                        value={streamInfo.rtmpUrl}
                                        onChange={(e) =>
                                            setStreamInfo({
                                                ...streamInfo,
                                                rtmpUrl: e.target.value,
                                            })
                                        }
                                        placeholder="rtmp://example.com/live"
                                        required
                                        className="w-full"
                                    />
                                </div>

                                <div>
                                    <label
                                        htmlFor="playlist-mode"
                                        className="block text-sm font-medium text-gray-300 mb-2"
                                    >
                                        Playlist Mode
                                    </label>
                                    <select
                                        id="playlist-mode"
                                        value={streamInfo.playlistMode}
                                        onChange={(e) =>
                                            setStreamInfo({
                                                ...streamInfo,
                                                playlistMode: e.target.value,
                                            })
                                        }
                                        className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2"
                                    >
                                        <option value="LOOP">Loop</option>
                                        <option value="ONCE">Play Once</option>
                                        <option value="SHUFFLE">Shuffle</option>
                                    </select>
                                </div>

                                <div className="flex gap-2">
                                    <Button
                                        type="submit"
                                        disabled={updateStreamMutation.isPending}
                                        className="flex items-center gap-2"
                                    >
                                        <Save className="h-4 w-4" />
                                        {updateStreamMutation.isPending
                                            ? "Saving..."
                                            : "Save Changes"}
                                    </Button>
                                </div>
                            </form>
                        </Card>
                    )}

                    {/* Video Management Tab */}
                    {activeTab === "videos" && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[60vh]">
                            {/* Stream Playlist */}
                            <Card className="p-4 flex flex-col">
                                <h3 className="text-lg font-medium text-white mb-4">
                                    Stream Playlist ({streamVideos.length} videos)
                                </h3>

                                <div className="flex-1 overflow-y-auto space-y-2">
                                    {streamVideos.length === 0 ? (
                                        <div className="text-center py-8 text-gray-400">
                                            <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                            <p>No videos in playlist</p>
                                            <p className="text-sm">Add videos from the library</p>
                                        </div>
                                    ) : (
                                        streamVideos.map((streamVideo, index) => (
                                            <div
                                                key={streamVideo.id}
                                                className="flex items-center gap-3 p-3 bg-gray-700 rounded-lg"
                                            >
                                                <div className="flex flex-col gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleMoveVideo(index, "up")}
                                                        disabled={
                                                            index === 0 ||
                                                            reorderVideosMutation.isPending
                                                        }
                                                        className="p-1 h-6 w-6"
                                                    >
                                                        <ArrowUp className="h-3 w-3" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() =>
                                                            handleMoveVideo(index, "down")
                                                        }
                                                        disabled={
                                                            index === streamVideos.length - 1 ||
                                                            reorderVideosMutation.isPending
                                                        }
                                                        className="p-1 h-6 w-6"
                                                    >
                                                        <ArrowDown className="h-3 w-3" />
                                                    </Button>
                                                </div>

                                                <div className="w-8 h-8 bg-gray-600 rounded flex items-center justify-center">
                                                    <Play className="h-4 w-4 text-gray-400" />
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-white truncate">
                                                        {streamVideo.video.originalName}
                                                    </p>
                                                    <p className="text-xs text-gray-400">
                                                        {(
                                                            Number(streamVideo.video.size) /
                                                            1024 /
                                                            1024
                                                        ).toFixed(1)}{" "}
                                                        MB
                                                    </p>
                                                </div>

                                                <div className="text-xs text-gray-400 px-2">
                                                    #{index + 1}
                                                </div>

                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() =>
                                                        handleRemoveVideo(streamVideo.id)
                                                    }
                                                    disabled={removeVideoMutation.isPending}
                                                    className="text-red-400 hover:text-red-300"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </Card>

                            {/* Video Library */}
                            <Card className="p-4 flex flex-col">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-medium text-white">
                                        Video Library
                                    </h3>
                                </div>

                                <div className="mb-4">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <Input
                                            placeholder="Search videos..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="pl-10"
                                        />
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto space-y-2">
                                    {filteredVideos.length === 0 ? (
                                        <div className="text-center py-8 text-gray-400">
                                            <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                            <p>No available videos</p>
                                            <p className="text-sm">
                                                Upload videos to add them to streams
                                            </p>
                                        </div>
                                    ) : (
                                        filteredVideos.map((video: StreamVideo["video"]) => (
                                            <div
                                                key={video.id}
                                                className="flex items-center gap-3 p-3 bg-gray-700 rounded-lg"
                                            >
                                                <div className="w-8 h-8 bg-gray-600 rounded flex items-center justify-center">
                                                    <Play className="h-4 w-4 text-gray-400" />
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-white truncate">
                                                        {video.originalName}
                                                    </p>
                                                    <p className="text-xs text-gray-400">
                                                        {(Number(video.size) / 1024 / 1024).toFixed(
                                                            1,
                                                        )}{" "}
                                                        MB • {video.user.username}
                                                    </p>
                                                </div>

                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleAddVideo(video)}
                                                    disabled={addVideoMutation.isPending}
                                                    className="flex items-center gap-1"
                                                >
                                                    <Plus className="h-3 w-3" />
                                                    {addVideoMutation.isPending
                                                        ? "Adding..."
                                                        : "Add"}
                                                </Button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </Card>
                        </div>
                    )}

                    <div className="flex justify-between items-center mt-6">
                        <div className="text-sm text-gray-400">
                            {activeTab === "info"
                                ? `Stream: ${streamInfo.name} • Mode: ${streamInfo.playlistMode}`
                                : `Mode: ${stream.playlistMode} • ${streamVideos.length} videos in playlist`}
                        </div>
                        <Button onClick={handleClose}>Close</Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
