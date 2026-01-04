// Event types for real-time updates
export type EventType = "streams" | "videos" | "users";

// In-memory store for active SSE connections
// Using a Map with clientId as key and controller as value
const clients = new Map<string, ReadableStreamDefaultController<Uint8Array>>();

/**
 * Register a new SSE client connection
 */
export function registerClient(
    clientId: string,
    controller: ReadableStreamDefaultController<Uint8Array>,
) {
    clients.set(clientId, controller);
}

/**
 * Unregister an SSE client connection
 */
export function unregisterClient(clientId: string) {
    clients.delete(clientId);
}

/**
 * Get the number of connected clients
 */
export function getClientCount(): number {
    return clients.size;
}

/**
 * Broadcast an event to all connected clients
 * @param type - The type of event (streams, videos, users)
 * @param targetUserId - Optional: Only broadcast to a specific user
 */
export function broadcastEvent(type: EventType, targetUserId?: string) {
    const event = JSON.stringify({ type, timestamp: Date.now() });
    const encoder = new TextEncoder();
    const data = encoder.encode(`data: ${event}\n\n`);

    const clientsToRemove: string[] = [];

    for (const [clientId, controller] of clients.entries()) {
        try {
            // If targetUserId is specified, only send to that user's connections
            // clientId format: userId-timestamp
            if (!targetUserId || clientId.startsWith(`${targetUserId}-`)) {
                controller.enqueue(data);
            }
        } catch (error) {
            // Client likely disconnected - mark for removal
            // Common errors: controller closed, stream cancelled
            console.debug(`[SSE] Client ${clientId} disconnected:`, error);
            clientsToRemove.push(clientId);
        }
    }

    // Clean up disconnected clients
    for (const clientId of clientsToRemove) {
        clients.delete(clientId);
    }
}

/**
 * Broadcast events to all connected clients for multiple event types
 */
export function broadcastEvents(types: EventType[], targetUserId?: string) {
    for (const type of types) {
        broadcastEvent(type, targetUserId);
    }
}
