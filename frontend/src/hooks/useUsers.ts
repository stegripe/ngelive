import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export const useUsers = () => {
    const { user } = useAuth();

    return useQuery({
        queryKey: ["users"],
        queryFn: async () => {
            if (user?.role !== "ADMIN") {
                return [];
            }
            const response = await api.get("/users");
            return response.data.data.users;
        },
        enabled: user?.role === "ADMIN",
    });
};

type CreateUserData = {
    username: string;
    email: string;
    password: string;
    role: string;
    rtmpQuota?: number;
};

export const useCreateUser = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: CreateUserData) => {
            const response = await api.post("/users", data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["users"] });
            toast.success("User created successfully!");
        },
        onError: (error: unknown) => {
            const err = error as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || "Failed to create user");
        },
    });
};

export const useUpdateUser = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<CreateUserData> }) => {
            const response = await api.put(`/users/${id}`, data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["users"] });
            toast.success("User updated successfully!");
        },
        onError: (error: unknown) => {
            const err = error as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || "Failed to update user");
        },
    });
};

export const useDeleteUser = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const response = await api.delete(`/users/${id}`);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["users"] });
            toast.success("User deleted successfully!");
        },
        onError: (error: unknown) => {
            const err = error as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || "Failed to delete user");
        },
    });
};
