"use client";

import { Play, Settings, Square, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api";
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
            <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">{stream.name}</h3>
                    <div className="flex items-center gap-2">
                        <span
                            className={`w-2 h-2 rounded-full ${
                                stream.isStreaming ? "bg-green-500" : "bg-gray-500"
                            }`}
                        />
                        <span className="text-sm text-gray-400">
                            {stream.isStreaming ? "Streaming" : "Stopped"}
                        </span>
                    </div>
                </div>

                <div className="space-y-2 mb-4">
                    <div className="text-sm text-gray-400">
                        <span className="font-medium">Videos:</span>{" "}
                        {stream.streamVideos?.length || 0}
                    </div>
                    <div className="text-sm text-gray-400">
                        <span className="font-medium">Mode:</span> {stream.playlistMode}
                    </div>
                    <div className="text-sm text-gray-400">
                        <span className="font-medium">Owner:</span> {stream.user?.username}{" "}
                        {stream.user.id === stream.user?.id && (
                            <span className="text-xs bg-blue-500/20 text-blue-400 px-1 py-0.5 rounded">
                                You
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex gap-2">
                    {stream.isStreaming ? (
                        <Button
                            variant="danger"
                            size="sm"
                            onClick={handleStop}
                            disabled={loading}
                            className="flex items-center gap-2"
                        >
                            <Square className="h-4 w-4" />
                            Stop
                        </Button>
                    ) : (
                        <Button
                            variant="success"
                            size="sm"
                            onClick={handleStart}
                            disabled={loading}
                            className="flex items-center gap-2"
                        >
                            <Play className="h-4 w-4" />
                            Start
                        </Button>
                    )}

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowSettings(true)}
                        disabled={loading}
                        className="flex items-center gap-2"
                    >
                        <Settings className="h-4 w-4" />
                        Settings
                    </Button>

                    <Button
                        variant="danger"
                        size="sm"
                        onClick={handleDelete}
                        disabled={loading || stream.isStreaming}
                        className="flex items-center gap-2"
                    >
                        <Trash2 className="h-4 w-4" />
                        Delete
                    </Button>
                </div>
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
