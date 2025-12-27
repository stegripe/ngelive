"use client";

import { Key, Mail, Shield, User, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreateUser } from "@/hooks/useUsers";

interface AddUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function AddUserModal({ isOpen, onClose, onSuccess }: AddUserModalProps) {
    const [formData, setFormData] = useState({
        username: "",
        email: "",
        password: "",
        role: "USER",
        rtmpQuota: 1,
    });

    const createUserMutation = useCreateUser();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        createUserMutation.mutate(formData, {
            onSuccess: () => {
                onSuccess();
                onClose();
                setFormData({
                    username: "",
                    email: "",
                    password: "",
                    role: "USER",
                    rtmpQuota: 1,
                });
            },
        });
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: name === "rtmpQuota" ? Number.parseInt(value, 10) : value,
        }));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-white">Add New User</h2>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClose}
                        className="text-gray-400 hover:text-white"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label
                            htmlFor="username"
                            className="block text-sm font-medium text-gray-300 mb-2"
                        >
                            <User className="h-4 w-4 inline mr-2" />
                            Username
                        </label>
                        <Input
                            id="username"
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            placeholder="Enter username"
                            required
                            className="w-full"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="email"
                            className="block text-sm font-medium text-gray-300 mb-2"
                        >
                            <Mail className="h-4 w-4 inline mr-2" />
                            Email
                        </label>
                        <Input
                            id="email"
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="Enter email"
                            required
                            className="w-full"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="password"
                            className="block text-sm font-medium text-gray-300 mb-2"
                        >
                            <Key className="h-4 w-4 inline mr-2" />
                            Password
                        </label>
                        <Input
                            id="password"
                            name="password"
                            type="password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="Enter password"
                            required
                            className="w-full"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="role"
                            className="block text-sm font-medium text-gray-300 mb-2"
                        >
                            <Shield className="h-4 w-4 inline mr-2" />
                            Role
                        </label>
                        <select
                            id="role"
                            name="role"
                            value={formData.role}
                            onChange={handleChange}
                            className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2"
                        >
                            <option value="USER">User</option>
                            <option value="ADMIN">Admin</option>
                        </select>
                    </div>

                    <div>
                        <label
                            htmlFor="rtmpQuota"
                            className="block text-sm font-medium text-gray-300 mb-2"
                        >
                            RTMP Quota
                        </label>
                        <Input
                            id="rtmpQuota"
                            name="rtmpQuota"
                            type="number"
                            min="1"
                            max="10"
                            value={formData.rtmpQuota}
                            onChange={handleChange}
                            className="w-full"
                        />
                    </div>

                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={createUserMutation.isPending}
                            className="flex-1"
                        >
                            {createUserMutation.isPending ? "Creating..." : "Create User"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
