"use client";

import { AlertCircle, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface UploadVideoProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function UploadVideo({ isOpen, onClose, onSuccess }: UploadVideoProps) {
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);
    const abortControllerRef = useRef<AbortController | null>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setError(null);
            setProgress(0);
        }
    };

    const handleUpload = () => {
        if (!file) {
            return;
        }

        setUploading(true);
        setError(null);
        setProgress(0);

        abortControllerRef.current = new AbortController();

        try {
            const formData = new FormData();
            formData.append("video", file);

            const token = localStorage.getItem("token");

            const xhr = new XMLHttpRequest();

            xhr.upload.addEventListener("progress", (e) => {
                if (e.lengthComputable) {
                    const percentComplete = Math.round((e.loaded * 100) / e.total);
                    setProgress(percentComplete);
                }
            });

            xhr.addEventListener("load", () => {
                if (xhr.status === 201) {
                    const result = JSON.parse(xhr.responseText);
                    console.info("Upload success:", result);

                    setFile(null);
                    setProgress(0);
                    onSuccess();
                    onClose();
                } else {
                    const error = JSON.parse(xhr.responseText);
                    setError(error.message || "Upload failed");
                }
                setUploading(false);
            });

            xhr.addEventListener("error", () => {
                setError("Upload failed. Please try again.");
                setUploading(false);
            });

            xhr.addEventListener("abort", () => {
                setError("Upload cancelled.");
                setUploading(false);
            });

            xhr.open("POST", "/api/videos");
            xhr.setRequestHeader("Authorization", `Bearer ${token}`);
            xhr.send(formData);

            abortControllerRef.current.signal.addEventListener("abort", () => {
                xhr.abort();
            });
        } catch (error: unknown) {
            console.error("Upload error:", error);
            if (error instanceof Error) {
                setError(error.message);
            } else {
                setError("Failed to upload video");
            }
            setUploading(false);
        }
    };

    const handleCancel = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        setFile(null);
        setProgress(0);
        setError(null);
        onClose();
    };

    if (!isOpen) {
        return null;
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4 border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-white">Upload Video</h2>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCancel}
                        className="text-gray-400 hover:text-white"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label
                            htmlFor="video-upload-input"
                            className="block text-sm font-medium text-gray-300 mb-2"
                        >
                            Video File
                        </label>
                        <Input
                            id="video-upload-input"
                            type="file"
                            accept="video/*"
                            onChange={handleFileSelect}
                            disabled={uploading}
                            className="w-full"
                        />
                        {file && (
                            <p className="text-sm text-gray-400 mt-1">
                                Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                            </p>
                        )}
                    </div>

                    {uploading && (
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm text-gray-300">
                                <span>Uploading...</span>
                                <span>{progress}%</span>
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-2">
                                <div
                                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="flex items-center gap-2 text-red-400 text-sm">
                            <AlertCircle className="h-4 w-4" />
                            {error}
                        </div>
                    )}

                    <div className="flex gap-2">
                        <Button variant="outline" onClick={handleCancel} disabled={false}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleUpload}
                            disabled={!file || uploading}
                            className="flex items-center gap-2"
                        >
                            {uploading ? (
                                <>
                                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                                    Uploading
                                </>
                            ) : (
                                <>
                                    <Upload className="h-4 w-4" />
                                    Upload Video
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export { UploadVideo as UploadVideoModal };
