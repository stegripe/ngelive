"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { Play, Users, Video } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function HomePage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (user && !loading) {
            router.push("/dashboard");
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4" />
                    <p className="text-gray-400">Loading...</p>
                </div>
            </div>
        );
    }

    if (user) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-900">
            {/* Header */}
            <header className="bg-gray-800 border-b border-gray-700">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center">
                            <div className="flex-shrink-0 flex items-center">
                                <Play className="h-8 w-8 text-blue-500" />
                                <span className="ml-2 text-xl font-bold text-white">ngelive</span>
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            <Button
                                variant="ghost"
                                onClick={() => router.push("/login")}
                                className="text-gray-300 hover:text-white"
                            >
                                Login
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="text-center">
                    <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
                        Live Streaming
                        <span className="block text-blue-500">Made Simple</span>
                    </h1>
                    <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
                        Stream your content, manage your videos, and engage with your audience all
                        in one place. Built with modern technology for creators who demand the best.
                    </p>
                    <div className="flex justify-center space-x-4">
                        <Button
                            size="lg"
                            onClick={() => router.push("/login")}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3"
                        >
                            Get Started
                        </Button>
                    </div>
                </div>

                {/* Features */}
                <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
                    <Card className="bg-gray-800 border-gray-700 p-6">
                        <div className="text-center">
                            <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-500 rounded-lg mb-4">
                                <Play className="h-6 w-6 text-white" />
                            </div>
                            <h3 className="text-xl font-semibold text-white mb-2">
                                Live Streaming
                            </h3>
                            <p className="text-gray-400">
                                Stream live to your audience with RTMP support and real-time
                                interaction.
                            </p>
                        </div>
                    </Card>

                    <Card className="bg-gray-800 border-gray-700 p-6">
                        <div className="text-center">
                            <div className="inline-flex items-center justify-center w-12 h-12 bg-green-500 rounded-lg mb-4">
                                <Video className="h-6 w-6 text-white" />
                            </div>
                            <h3 className="text-xl font-semibold text-white mb-2">Video Library</h3>
                            <p className="text-gray-400">
                                Upload, organize, and share your video content with ease.
                            </p>
                        </div>
                    </Card>

                    <Card className="bg-gray-800 border-gray-700 p-6">
                        <div className="text-center">
                            <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-500 rounded-lg mb-4">
                                <Users className="h-6 w-6 text-white" />
                            </div>
                            <h3 className="text-xl font-semibold text-white mb-2">
                                User Management
                            </h3>
                            <p className="text-gray-400">
                                Manage users, permissions, and access control for your content.
                            </p>
                        </div>
                    </Card>
                </div>

                {/* Stats */}
                <div className="mt-20 bg-gray-800 rounded-lg p-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                        <div>
                            <div className="text-3xl font-bold text-blue-500 mb-2">100%</div>
                            <div className="text-gray-400">Open Source</div>
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-green-500 mb-2">2GB</div>
                            <div className="text-gray-400">Max Upload Size</div>
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-purple-500 mb-2">24/7</div>
                            <div className="text-gray-400">Streaming Support</div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="bg-gray-800 border-t border-gray-700 mt-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="text-center text-gray-400">
                        <p>
                            &copy; 2026 ngelive. Built with ⭐ by{" "}
                            <a
                                href="https://stegripe.org/github"
                                className="text-blue-500 hover:text-blue-400"
                            >
                                Stegripe Development
                            </a>
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
