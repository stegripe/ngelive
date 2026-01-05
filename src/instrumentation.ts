export async function register() {
    // biome-ignore lint/style/noRestrictedGlobals: NEXT_RUNTIME check requires global process
    if (process.env.NEXT_RUNTIME === "nodejs") {
        const { restorePreviousStreams } = await import("@/lib/ffmpeg");

        console.log("[Instrumentation] Server starting, checking for streams to restore...");

        globalThis.setTimeout(async () => {
            try {
                await restorePreviousStreams();
            } catch (error) {
                console.error("[Instrumentation] Error restoring streams:", error);
            }
        }, 3000);
    }
}
