import crypto from "node:crypto";

export const generateStreamKey = (): string => {
    return crypto.randomBytes(16).toString("hex");
};

export const validateRtmpUrl = (url: string): boolean => {
    const rtmpRegex = /^rtmp:\/\/[^\s]+$/;
    return rtmpRegex.test(url);
};

export const parseRtmpUrl = (url: string) => {
    try {
        const parts = url.split("/");
        const server = parts.slice(0, 3).join("/");
        const streamKey = parts.slice(3).join("/");

        return {
            server,
            streamKey,
        };
    } catch {
        return null;
    }
};
