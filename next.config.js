/** @type {import('next').NextConfig} */
const nextConfig = {
    // Only use standalone output in Docker/production
    ...(process.env.STANDALONE === "true" && { output: "standalone" }),
    typescript: {
        ignoreBuildErrors: false,
    },
    eslint: {
        ignoreDuringBuilds: true,
    },
    images: {
        domains: ["localhost"],
        remotePatterns: [
            {
                protocol: "http",
                hostname: "localhost",
            },
        ],
    },
    // Increase body size limit for video uploads
    experimental: {
        serverActions: {
            bodySizeLimit: "2gb",
        },
    },
};

module.exports = nextConfig;
