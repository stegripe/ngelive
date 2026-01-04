// Event types for real-time updates
export type EventType =
    | "stream:created"
    | "stream:updated"
    | "stream:deleted"
    | "stream:started"
    | "stream:stopped"
    | "video:created"
    | "video:deleted"
    | "video:added_to_stream"
    | "video:removed_from_stream"
    | "video:reordered"
    | "user:created"
    | "user:updated"
    | "user:deleted";

export interface AppEvent {
    type: EventType;
    data: unknown;
    timestamp: number;
}

type EventCallback = (event: AppEvent) => void;

class EventEmitter {
    private listeners: Set<EventCallback> = new Set();

    public subscribe(callback: EventCallback): () => void {
        this.listeners.add(callback);
        return () => {
            this.listeners.delete(callback);
        };
    }

    public emit(type: EventType, data: unknown = {}): void {
        const event: AppEvent = {
            type,
            data,
            timestamp: Date.now(),
        };

        for (const listener of this.listeners) {
            try {
                listener(event);
            } catch (error) {
                console.error("Error in event listener:", error);
            }
        }
    }

    public getListenerCount(): number {
        return this.listeners.size;
    }
}

// Singleton instance
const globalForEvents = globalThis as unknown as {
    eventEmitter: EventEmitter | undefined;
};

export const eventEmitter = globalForEvents.eventEmitter ?? new EventEmitter();

if (globalThis.process.env.NODE_ENV !== "production") {
    globalForEvents.eventEmitter = eventEmitter;
}

export default eventEmitter;
