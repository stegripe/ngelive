"use client";

import { Film, Play, Radio, Settings, Square, Trash2, User } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { type RtmpStream } from "@/types";
import { RtmpSettings } from "./rtmp-settings";

interface RtmpCardProps {
    stream: RtmpStream;
    onUpdate: () => void;
}

export function RtmpCard({ stream, onUpdate }: RtmpCardProps) {
    const [loading, setLoading] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

    const handleStart = async () => {
        setLoading(true);
        try {
            await api.post(`/rtmp/${stream.id}/start`);
            onUpdate();
        } catch (error) {
            console.error("Failed to start stream:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleStop = async () => {
        setLoading(true);
        try {
            await api.post(`/rtmp/${stream.id}/stop`);
            onUpdate();
        } catch (error) {
            console.error("Failed to stop stream:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (confirm("Are you sure you want to delete this stream?")) {
            setLoading(true);
            try {
                await api.delete(`/rtmp/${stream.id}`);
                onUpdate();
            } catch (error) {
                console.error("Failed to delete stream:", error);
            } finally {
                setLoading(false);
            }
        }
    };

    return (
        <>
            <Card className="overflow-hidden group hover:border-gray-600 transition-colors">
                {/* Header with status */}
                <div
                    className={cn(
                        "px-4 py-3 flex items-center justify-between border-b",
                        stream.isStreaming
                            ? "bg-green-500/10 border-green-500/20"
                            : "bg-gray-800/50 border-gray-700/50",
                    )}
                >
                    <div className="flex items-center gap-2">
                        <Radio
                            className={cn(
                                "h-4 w-4",
                                stream.isStreaming
                                    ? "text-green-400 animate-pulse"
                                    : "text-gray-500",
                            )}
                        />
                        <span
                            className={cn(
                                "text-sm font-medium",
                                stream.isStreaming ? "text-green-400" : "text-gray-400",
                            )}
                        >
                            {stream.isStreaming ? "Live" : "Offline"}
                        </span>
                    </div>
                    <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">
                        {stream.playlistMode}
                    </span>
                </div>

                <CardContent className="p-4 space-y-4">
                    {/* Stream name */}
                    <h3 className="text-lg font-semibold text-white truncate" title={stream.name}>
                        {stream.name}
                    </h3>

                    {/* Stats */}
                    <div className="flex flex-wrap gap-3">
                        <span className="inline-flex items-center gap-1.5 text-xs text-gray-400 bg-gray-800/50 px-2 py-1 rounded">
                            <Film className="h-3 w-3" />
                            {stream.streamVideos?.length || 0} videos
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-xs text-gray-400 bg-gray-800/50 px-2 py-1 rounded">
                            <User className="h-3 w-3" />
                            {stream.user?.username}
                        </span>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-700/50">
                        {stream.isStreaming ? (
                            <Button
                                variant="danger"
                                size="sm"
                                onClick={handleStop}
                                disabled={loading}
                                className="flex-1 sm:flex-none"
                            >
                                <Square className="h-3.5 w-3.5" />
                                Stop
                            </Button>
                        ) : (
                            <Button
                                variant="success"
                                size="sm"
                                onClick={handleStart}
                                disabled={loading || (stream.streamVideos?.length || 0) === 0}
                                className="flex-1 sm:flex-none"
                            >
                                <Play className="h-3.5 w-3.5" />
                                Start
                            </Button>
                        )}

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowSettings(true)}
                            disabled={loading}
                        >
                            <Settings className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Settings</span>
                        </Button>

                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleDelete}
                            disabled={loading || stream.isStreaming}
                            className="text-gray-400 hover:text-red-400 hover:bg-red-500/10"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <RtmpSettings
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
                stream={stream}
                onUpdate={onUpdate}
            />
        </>
    );
}
