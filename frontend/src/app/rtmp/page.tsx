"use client";

import { Plus, Search, Video } from "lucide-react";
import { useState } from "react";
import { LayoutWrapper } from "@/components/layout/wrapper";
import { CreateRtmpModal } from "@/components/rtmp/create-rtmp";
import { RtmpCard } from "@/components/rtmp/rtmp-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useStreams } from "@/hooks/useStreams";
import { type RtmpStream } from "@/types";

// Use RtmpStream instead of defining a local Stream interface
type Stream = RtmpStream;

export default function RtmpPage() {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    const { data: streams = [], isLoading, error, refetch } = useStreams();

    const filteredStreams = streams.filter((stream: Stream) =>
        stream.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (isLoading) {
        return (
            <LayoutWrapper>
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4" />
                        <p className="text-gray-400">Loading streams...</p>
                    </div>
                </div>
            </LayoutWrapper>
        );
    }

    if (error) {
        return (
            <LayoutWrapper>
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <p className="text-red-400 mb-4">Error loading streams</p>
                        <Button onClick={() => refetch()} variant="outline">
                            Retry
                        </Button>
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
                        <h1 className="text-2xl font-bold text-white">RTMP Streams</h1>
                        <p className="text-gray-400">Manage your live streams</p>
                    </div>
                    <Button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        Create Stream
                    </Button>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Search streams..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <div className="text-sm text-gray-400">
                        {filteredStreams.length} of {streams.length} streams
                    </div>
                </div>

                {filteredStreams.length === 0 ? (
                    <Card className="p-12 text-center">
                        <div className="text-gray-400">
                            <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p className="text-lg mb-2">No streams found</p>
                            <p className="text-sm">
                                {searchTerm
                                    ? "Try adjusting your search terms"
                                    : "You have not created any streams yet"}
                            </p>
                        </div>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredStreams.map((stream: Stream) => (
                            <RtmpCard key={stream.id} stream={stream} onUpdate={refetch} />
                        ))}
                    </div>
                )}
            </div>

            <CreateRtmpModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSuccess={() => {
                    setShowCreateModal(false);
                    // React Query akan auto-refresh data
                }}
            />
        </LayoutWrapper>
    );
}
