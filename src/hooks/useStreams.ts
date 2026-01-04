import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api-client";

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
            toast.success("Stream created successfully!");
        },
        onError: (error: unknown) => {
            const err = error as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || "Failed to create stream");
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
            toast.success("Stream updated successfully!");
        },
        onError: (error: unknown) => {
            const err = error as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || "Failed to update stream");
        },
    });
};

export const useDeleteStream = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/rtmp/${id}`);
        },
        onMutate: async (id: string) => {
            await queryClient.cancelQueries({ queryKey: ["streams"] });
            const previousStreams = queryClient.getQueryData<Stream[]>(["streams"]);
            queryClient.setQueryData(["streams"], (old: Stream[] | undefined) =>
                old?.filter((stream: Stream) => stream.id !== id),
            );
            return { previousStreams };
        },
        onError: (_err, _id, context) => {
            if (context?.previousStreams) {
                queryClient.setQueryData(["streams"], context.previousStreams);
            }
            toast.error("Failed to delete stream");
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["streams"] });
        },
        onSuccess: () => {
            toast.success("Stream deleted successfully!");
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
            toast.success("Stream started!");
        },
        onError: (error: unknown) => {
            const err = error as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || "Failed to start stream");
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
            toast.success("Stream stopped!");
        },
        onError: (error: unknown) => {
            const err = error as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || "Failed to stop stream");
        },
    });
};

export const useAddVideoToStream = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ streamId, videoId }: { streamId: string; videoId: string }) => {
            const response = await api.post(`/rtmp/${streamId}/videos`, { videoId });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["streams"] });
            toast.success("Video added to stream!");
        },
        onError: (error: unknown) => {
            const err = error as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || "Failed to add video");
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
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["streams"] });
            toast.success("Video removed from stream!");
        },
        onError: (error: unknown) => {
            const err = error as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || "Failed to remove video");
        },
    });
};
