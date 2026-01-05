// Next.js Instrumentation - runs on server startup
// https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation

export async function register() {
    // Only run on server (not during build or client)
    if (process.env.NEXT_RUNTIME === "nodejs") {
        // Dynamic import to avoid issues during build
        const { restorePreviousStreams } = await import("@/lib/ffmpeg");
        
        console.log("[Instrumentation] Server starting, checking for streams to restore...");
        
        // Restore streams that were running before shutdown
        // Use setTimeout to let the server fully initialize first
        setTimeout(async () => {
            try {
                await restorePreviousStreams();
            } catch (error) {
                console.error("[Instrumentation] Error restoring streams:", error);
            }
        }, 3000); // 3 second delay to let DB connection initialize
    }
}
