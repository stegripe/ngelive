export interface User {
    id: string;
    email: string;
    username: string;
    role: "ADMIN" | "USER";
    rtmpQuota: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface RtmpStream {
    id: string;
    name: string;
    streamKey: string;
    rtmpUrl: string;
    isActive: boolean;
    isStreaming: boolean;
    currentVideo: string | null;
    playlistMode: "LOOP" | "ONCE" | "SHUFFLE" | "SHUFFLE_LOOP";
    createdAt: string;
    updatedAt: string;
    user: User;
    streamVideos: StreamVideo[];
}

export interface Video {
    id: string;
    filename: string;
    originalName: string;
    path: string;
    size: number;
    duration: number | null;
    resolution: string | null;
    format: string | null;
    uploadedAt: string;
    user: User;
}

export interface StreamVideo {
    id: string;
    order: number;
    stream: RtmpStream;
    video: Video;
}
