import { api } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export type Video = {
    id: string;
};

export const useVideos = () => {
    return useQuery({
        queryKey: ["videos"],
        queryFn: async () => {
            const response = await api.get("/videos");
            return response.data.data.videos;
        },
    });
};

export const useUploadVideo = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (formData: FormData) => {
            const response = await api.post("/videos/upload", formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["videos"] });
            toast.success("Video uploaded successfully!");
        },
        onError: (error: unknown) => {
            type ErrorResponse = {
                response?: {
                    data?: {
                        message?: string;
                    };
                };
            };

            const err = error as ErrorResponse;

            if (
                typeof error === "object" &&
                error !== null &&
                err.response &&
                typeof err.response === "object" &&
                err.response !== null &&
                err.response.data &&
                typeof err.response.data === "object" &&
                err.response.data !== null &&
                "message" in err.response.data
            ) {
                toast.error(err.response.data?.message || "Failed to upload video");
            } else {
                toast.error("Failed to upload video");
            }
        },
    });
};

export const useDeleteVideo = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const response = await api.delete(`/videos/${id}`);
            return response.data;
        },
        onMutate: async (id: string) => {
            await queryClient.cancelQueries({ queryKey: ["videos"] });

            const previousVideos = queryClient.getQueryData<Video[]>(["videos"]);

            queryClient.setQueryData<Video[]>(["videos"], (old) =>
                old?.filter((video) => video.id !== id)
            );

            return { previousVideos };
        },
        onError: (_err, _id, context) => {
            queryClient.setQueryData(["videos"], context?.previousVideos);
            toast.error("Failed to delete video");
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["videos"] });
        },
        onSuccess: () => {
            toast.success("Video deleted successfully!");
        },
    });
};
