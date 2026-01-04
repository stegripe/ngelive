import { api } from "@/lib/api-client";
import { toastManager } from "@/lib/toast-manager";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export const useAddVideoToStream = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ streamId, videoId }: { streamId: string; videoId: string }) => {
            const response = await api.post(`/rtmp/${streamId}/videos`, { videoId });
            return response.data;
        },
        onMutate: async ({ streamId, videoId }) => {
            // Cancel any outgoing refetches
            await queryClient.cancelQueries({ queryKey: ["streams"] });

            // Snapshot the previous value
            const previousStreams = queryClient.getQueryData(["streams"]);

            return { previousStreams, streamId, videoId };
        },
        onError: (error: unknown, variables) => {
            const { streamId, videoId } = variables;
            const errorId = `add-video-error-${streamId}-${videoId}`;

            // Clear any existing success toast
            toastManager.dismiss(`add-video-success-${streamId}-${videoId}`);

            // Show error toast
            type ErrorWithResponse = {
                response?: {
                    data?: {
                        message?: string;
                    };
                };
            };

            const err = error as ErrorWithResponse;
            const errorMessage =
                typeof error === "object" &&
                error !== null &&
                "response" in error &&
                typeof err.response?.data?.message === "string"
                    ? err.response?.data?.message
                    : "Failed to add video to stream";
            toastManager.error(errorMessage, errorId);
        },
        onSuccess: (_data, variables) => {
            const { streamId, videoId } = variables;
            const successId = `add-video-success-${streamId}-${videoId}`;

            // Clear any existing error toast
            toastManager.dismiss(`add-video-error-${streamId}-${videoId}`);

            // Show success toast
            toastManager.success("Video added to stream!", successId);

            // Invalidate queries
            queryClient.invalidateQueries({ queryKey: ["streams"] });
        },
    });
};

export const useRemoveVideoFromStream = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ streamId, videoId }: { streamId: string; videoId: string }) => {
            const response = await api.delete(`/rtmp/${streamId}/videos/${videoId}`);
            return response.data;
        },
        onMutate: async ({ streamId, videoId }) => {
            await queryClient.cancelQueries({ queryKey: ["streams"] });
            const previousStreams = queryClient.getQueryData(["streams"]);
            return { previousStreams, streamId, videoId };
        },
        onError: (error: unknown, variables) => {
            const { streamId, videoId } = variables;
            const errorId = `remove-video-error-${streamId}-${videoId}`;

            toastManager.dismiss(`remove-video-success-${streamId}-${videoId}`);

            type ErrorWithResponse = {
                response?: {
                    data?: {
                        message?: string;
                    };
                };
            };

            const err = error as ErrorWithResponse;
            const errorMessage =
                typeof error === "object" &&
                error !== null &&
                "response" in error &&
                typeof err.response?.data?.message === "string"
                    ? err.response?.data?.message
                    : "Failed to remove video from stream";
            toastManager.error(errorMessage, errorId);
        },
        onSuccess: (_data, variables) => {
            const { streamId, videoId } = variables;
            const successId = `remove-video-success-${streamId}-${videoId}`;

            toastManager.dismiss(`remove-video-error-${streamId}-${videoId}`);
            toastManager.success("Video removed from stream!", successId);

            queryClient.invalidateQueries({ queryKey: ["streams"] });
        },
    });
};

export const useReorderStreamVideos = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            streamId,
            videoOrders,
        }: { streamId: string; videoOrders: { videoId: string; order: number }[] }) => {
            const response = await api.put(`/rtmp/${streamId}/reorder`, { videoOrders });
            return response.data;
        },
        onMutate: async ({ streamId }) => {
            await queryClient.cancelQueries({ queryKey: ["streams"] });
            const previousStreams = queryClient.getQueryData(["streams"]);
            return { previousStreams, streamId };
        },
        onError: (error: unknown, variables) => {
            const { streamId } = variables;
            const errorId = `reorder-video-error-${streamId}`;

            toastManager.dismiss(`reorder-video-success-${streamId}`);

            type ErrorWithResponse = {
                response?: {
                    data?: {
                        message?: string;
                    };
                };
            };

            const err = error as ErrorWithResponse;
            const errorMessage =
                typeof error === "object" &&
                error !== null &&
                "response" in error &&
                typeof err.response?.data?.message === "string"
                    ? err.response?.data?.message
                    : "Failed to reorder videos";
            toastManager.error(errorMessage, errorId);
        },
        onSuccess: (_data, variables) => {
            const { streamId } = variables;
            const successId = `reorder-video-success-${streamId}`;

            toastManager.dismiss(`reorder-video-error-${streamId}`);
            toastManager.success("Video order updated!", successId);

            queryClient.invalidateQueries({ queryKey: ["streams"] });
        },
    });
};
