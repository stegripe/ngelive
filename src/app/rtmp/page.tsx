"use client";

import { AlertCircle, Monitor, Plus, Radio, Search, Zap } from "lucide-react";
import { useState } from "react";
import { LayoutWrapper } from "@/components/layout/wrapper";
import { CreateRtmpModal } from "@/components/rtmp/create-rtmp";
import { RtmpCard } from "@/components/rtmp/rtmp-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useStreams } from "@/hooks/useStreams";
import { useAuth } from "@/lib/auth-context";
import { type RtmpStream } from "@/types";

// Use RtmpStream instead of defining a local Stream interface
type Stream = RtmpStream;

export default function RtmpPage() {
    const { user } = useAuth();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    const { data: streams = [], isLoading, error, refetch } = useStreams();

    const filteredStreams = streams.filter((stream: Stream) =>
        stream.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );

    const activeStreams = streams.filter((s: Stream) => s.isStreaming).length;
    const isUnlimited = user?.rtmpQuota === -1 || user?.role === "ADMIN";
    const canCreateMore = isUnlimited || (user?.rtmpQuota || 0) > streams.length;

    if (isLoading) {
        return (
            <LayoutWrapper>
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <div className="relative">
                            <div className="w-12 h-12 border-4 border-gray-700 rounded-full" />
                            <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin absolute inset-0" />
                        </div>
                        <p className="mt-4 text-gray-400">Loading streams...</p>
                    </div>
                </div>
            </LayoutWrapper>
        );
    }

    if (error) {
        return (
            <LayoutWrapper>
                <div className="flex items-center justify-center h-64">
                    <Card className="p-8 text-center max-w-md">
                        <div className="w-16 h-16 mx-auto mb-4 bg-red-500/10 rounded-full flex items-center justify-center">
                            <AlertCircle className="h-8 w-8 text-red-400" />
                        </div>
                        <p className="text-white font-medium mb-2">Error loading streams</p>
                        <p className="text-gray-400 text-sm mb-4">
                            Something went wrong while fetching your streams
                        </p>
                        <Button onClick={() => refetch()} variant="outline">
                            Try Again
                        </Button>
                    </Card>
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
                        <h1 className="text-2xl sm:text-3xl font-bold text-white">RTMP Streams</h1>
                        <p className="text-gray-400 mt-1">Manage your live streams</p>
                    </div>
                    <Button
                        onClick={() => setShowCreateModal(true)}
                        disabled={!canCreateMore}
                        className="w-full sm:w-auto"
                    >
                        <Plus className="h-4 w-4" />
                        Create Stream
                    </Button>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <Card className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary-500/10 rounded-lg">
                                <Monitor className="h-5 w-5 text-primary-400" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Total Streams</p>
                                <p className="text-xl font-bold text-white">{streams.length}</p>
                            </div>
                        </div>
                    </Card>
                    <Card className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-500/10 rounded-lg">
                                <Radio className="h-5 w-5 text-green-400" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Active</p>
                                <p className="text-xl font-bold text-white">{activeStreams}</p>
                            </div>
                        </div>
                    </Card>
                    <Card className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-yellow-500/10 rounded-lg">
                                <Zap className="h-5 w-5 text-yellow-400" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Quota Used</p>
                                <p className="text-xl font-bold text-white">
                                    {isUnlimited ? (
                                        <span className="text-yellow-400">∞ Unlimited</span>
                                    ) : (
                                        `${streams.length}/${user?.rtmpQuota || 0}`
                                    )}
                                </p>
                            </div>
                        </div>
                    </Card>
                    <Card className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gray-500/10 rounded-lg">
                                <Monitor className="h-5 w-5 text-gray-400" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Inactive</p>
                                <p className="text-xl font-bold text-white">
                                    {streams.length - activeStreams}
                                </p>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Search */}
                <Card className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                            <Input
                                placeholder="Search streams..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                            <span>
                                {filteredStreams.length} of {streams.length} streams
                            </span>
                        </div>
                    </div>
                </Card>

                {filteredStreams.length === 0 ? (
                    <Card className="p-8 sm:p-12">
                        <div className="text-center">
                            <div className="w-20 h-20 mx-auto mb-6 bg-gray-800 rounded-full flex items-center justify-center">
                                <Monitor className="h-10 w-10 text-gray-600" />
                            </div>
                            <p className="text-lg font-medium text-white mb-2">No streams found</p>
                            <p className="text-gray-400 mb-6">
                                {searchTerm
                                    ? "Try adjusting your search terms"
                                    : "Create your first stream to get started"}
                            </p>
                            {!searchTerm && canCreateMore && (
                                <Button onClick={() => setShowCreateModal(true)}>
                                    <Plus className="h-4 w-4" />
                                    Create Stream
                                </Button>
                            )}
                        </div>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
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
                }}
            />
        </LayoutWrapper>
    );
}
