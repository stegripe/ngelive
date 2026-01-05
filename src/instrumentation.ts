export async function register() {
    if (process.env.NEXT_RUNTIME === "nodejs") {
        const { restorePreviousStreams } = await import("@/lib/ffmpeg");

        console.log("[Instrumentation] Server starting, checking for streams to restore...");

        setTimeout(async () => {
            try {
                await restorePreviousStreams();
            } catch (error) {
                console.error("[Instrumentation] Error restoring streams:", error);
            }
        }, 3000);
    }
}
