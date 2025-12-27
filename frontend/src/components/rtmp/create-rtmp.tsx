"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { api } from "@/lib/api";

interface CreateRtmpModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function CreateRtmpModal({ isOpen, onClose, onSuccess }: CreateRtmpModalProps) {
    const [formData, setFormData] = useState({
        name: "",
        rtmpUrl: "",
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            await api.post("/rtmp", formData);
            onSuccess();
            setFormData({ name: "", rtmpUrl: "" });
        } catch (err: unknown) {
            if (
                err &&
                typeof err === "object" &&
                "response" in err &&
                err.response &&
                typeof err.response === "object" &&
                "data" in err.response &&
                err.response.data &&
                typeof err.response.data === "object" &&
                "message" in err.response.data
            ) {
                setError(
                    (err.response as { data: { message?: string } }).data.message ||
                        "Failed to create stream"
                );
            } else {
                setError("Failed to create stream");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Create RTMP Stream">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label
                        htmlFor="stream-name"
                        className="block text-sm font-medium text-gray-300 mb-2"
                    >
                        Stream Name
                    </label>
                    <Input
                        id="stream-name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Enter stream name"
                        required
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
                        value={formData.rtmpUrl}
                        onChange={(e) => setFormData({ ...formData, rtmpUrl: e.target.value })}
                        placeholder="rtmp://a.rtmp.youtube.com/live2/your-stream-key"
                        required
                    />
                </div>

                {error && <div className="text-red-400 text-sm">{error}</div>}

                <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={loading}>
                        {loading ? "Creating..." : "Create Stream"}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
