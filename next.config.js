/** @type {import('next').NextConfig} */
const isStandalone =
    // biome-ignore lint/style/noRestrictedGlobals: false
    typeof process !== "undefined" && process.env && process.env.STANDALONE === "true";
const nextConfig = {
    ...(isStandalone && { output: "standalone" }),
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
    experimental: {
        serverActions: {
            bodySizeLimit: "2gb",
        },
    },
};

export default nextConfig;
