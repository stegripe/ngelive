"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "./api";

interface User {
    id: string;
    email: string;
    username: string;
    role: string;
    rtmpQuota: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
    checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const checkAuth = useCallback(async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) {
                setLoading(false);
                return;
            }

            api.defaults.headers.common.Authorization = `Bearer ${token}`;
            const response = await api.get("/auth/profile");
            setUser(response.data.data.user);
        } catch (error) {
            console.error("Auth check failed:", error);
            localStorage.removeItem("token");
            api.defaults.headers.common.Authorization = undefined;
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    const login = async (email: string, password: string) => {
        const response = await api.post("/auth/login", { email, password });
        const { token, user } = response.data.data;

        localStorage.setItem("token", token);
        api.defaults.headers.common.Authorization = `Bearer ${token}`;
        setUser(user);
    };

    const logout = () => {
        localStorage.removeItem("token");
        api.defaults.headers.common.Authorization = undefined;
        setUser(null);
        router.push("/login");
    };

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, checkAuth }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
