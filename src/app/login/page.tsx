"use client";

import { AlertCircle, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            await login(email, password);
            router.push("/dashboard");
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("Login failed");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-900">
            {/* Background decorations */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-500/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />
            </div>

            <Card className="relative w-full max-w-md p-6 sm:p-8">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-500/25">
                        <span className="text-white font-bold text-2xl">N</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">Welcome Back</h1>
                    <p className="text-gray-400 text-sm sm:text-base">
                        Sign in to your ngelive account
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                        <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                            Email
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="name@example.com"
                                className="pl-10"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label
                            htmlFor="password"
                            className="block text-sm font-medium text-gray-300"
                        >
                            Password
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                            <Input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="pl-10 pr-10"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                            >
                                {showPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                ) : (
                                    <Eye className="h-4 w-4" />
                                )}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                            <AlertCircle className="h-4 w-4 flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <Button type="submit" className="w-full h-11" disabled={loading}>
                        {loading ? (
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Signing in...
                            </div>
                        ) : (
                            "Sign In"
                        )}
                    </Button>
                </form>

                <div className="mt-8 pt-6 border-t border-gray-700/50">
                    <p className="text-center text-xs text-gray-500 mb-3">Demo Credentials</p>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
                            <p className="text-primary-400 font-medium mb-1">Admin</p>
                            <p className="text-gray-400">admin@stegripe.org</p>
                            <p className="text-gray-500">admin123</p>
                        </div>
                        <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
                            <p className="text-gray-300 font-medium mb-1">User</p>
                            <p className="text-gray-400">user@stegripe.org</p>
                            <p className="text-gray-500">user123</p>
                        </div>
                    </div>
                </div>

                {/* Watermark */}
                <p className="text-center text-[10px] text-gray-600 mt-6">
                    <span className="font-semibold text-gray-500">ngelive</span> by{" "}
                    <a
                        href="https://stegripe.org"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-500/70 hover:text-primary-400 transition-colors"
                    >
                        Stegripe Development
                    </a>
                </p>
            </Card>
        </div>
    );
}
