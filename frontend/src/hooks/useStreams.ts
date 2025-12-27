import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toastManager } from "@/lib/toast-manager";

interface Stream {
    id: string;
    name: string;
    rtmpUrl: string;
}

export const useStreams = () => {
    return useQuery({
        queryKey: ["streams"],
        queryFn: async () => {
            const response = await api.get("/rtmp");
            return response.data.data.streams;
        },
    });
};

export const useCreateStream = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: { name: string; rtmpUrl: string }) => {
            const response = await api.post("/rtmp", data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["streams"] });
            toastManager.success("Stream created successfully!");
        },
        onError: (error: unknown) => {
            const message =
                typeof error === "object" &&
                error !== null &&
                "response" in error &&
                typeof (error as { response?: { data?: { message?: string } } })?.response?.data
                    ?.message === "string"
                    ? (error as { response: { data: { message: string } } }).response.data.message
                    : "Failed to create stream";
            toastManager.error(message);
        },
    });
};

export const useUpdateStream = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
            const response = await api.put(`/rtmp/${id}`, data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["streams"] });
            toastManager.success("Stream updated successfully!");
        },
        onError: (error: unknown) => {
            const message =
                typeof error === "object" &&
                error !== null &&
                "response" in error &&
                typeof (error as { response?: { data?: { message?: string } } })?.response?.data
                    ?.message === "string"
                    ? (error as { response: { data: { message: string } } }).response.data.message
                    : "Failed to update stream";
            toastManager.error(message);
        },
    });
};

export const useDeleteStream = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/rtmp/${id}`);
            queryClient.setQueryData(["streams"], (old: Stream[] | undefined) =>
                old?.filter((stream: Stream) => stream.id !== id)
            );
            await queryClient.cancelQueries({ queryKey: ["streams"] });

            const previousStreams = queryClient.getQueryData(["streams"]);

            queryClient.setQueryData(["streams"], (old: Stream[] | undefined) =>
                old?.filter((stream: Stream) => stream.id !== id)
            );

            return { previousStreams };
        },
        onError: (_err, _id, context: { previousStreams?: Stream[] } | undefined) => {
            queryClient.setQueryData(["streams"], context?.previousStreams);
            toastManager.error("Failed to delete stream");
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["streams"] });
        },
        onSuccess: () => {
            toastManager.success("Stream deleted successfully!");
        },
    });
};

export const useStartStream = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const response = await api.post(`/rtmp/${id}/start`);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["streams"] });
            toastManager.success("Stream started successfully!");
        },
        onError: (error: unknown) => {
            if (
                typeof error === "object" &&
                error !== null &&
                "response" in error &&
                typeof (error as { response?: { data?: { message?: string } } })?.response?.data
                    ?.message === "string"
            ) {
                toastManager.error(
                    (error as { response: { data: { message: string } } }).response.data.message
                );
            } else {
                toastManager.error("Failed to start stream");
            }
        },
    });
};

export const useStopStream = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const response = await api.post(`/rtmp/${id}/stop`);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["streams"] });
            toastManager.success("Stream stopped successfully!");
        },
        onError: (error: unknown) => {
            if (
                typeof error === "object" &&
                error !== null &&
                "response" in error &&
                typeof (error as { response?: { data?: { message?: string } } })?.response?.data
                    ?.message === "string"
            ) {
                toastManager.error(
                    (error as { response: { data: { message: string } } }).response.data.message
                );
            } else {
                toastManager.error("Failed to stop stream");
            }
        },
    });
};
