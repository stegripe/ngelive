"use client";

import { AddUserModal } from "@/components/admin/add-user-modal";
import { EditUserModal } from "@/components/admin/edit-user-modal";
import { LayoutWrapper } from "@/components/layout/wrapper";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useDeleteUser, useUsers } from "@/hooks/useUsers";
import { Edit, Plus, Shield, Trash2, User } from "lucide-react";
import { useState } from "react";

type UserType = {
    id: string;
    username: string;
    email: string;
    role: string;
    rtmpQuota: number;
    isActive: boolean;
};

export default function AdminUsersPage() {
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UserType | null>(null);

    const { data: users = [], isLoading, refetch } = useUsers();
    const deleteUserMutation = useDeleteUser();

    const handleEditUser = (user: UserType) => {
        setSelectedUser(user);
        setShowEditModal(true);
    };

    const handleDeleteUser = (userId: string) => {
        if (confirm("Are you sure you want to delete this user?")) {
            deleteUserMutation.mutate(userId);
        }
    };

    const handleSuccess = () => {
        refetch();
    };

    if (isLoading) {
        return (
            <LayoutWrapper>
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
                </div>
            </LayoutWrapper>
        );
    }

    return (
        <LayoutWrapper>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-white">User Management</h1>
                        <p className="text-gray-400">System management and configuration</p>
                    </div>
                    <Button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        Add User
                    </Button>
                </div>

                <Card className="overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-700">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                                        User
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                                        Email
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                                        Role
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                                        RTMP Quota
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-gray-800 divide-y divide-gray-700">
                                {users.map((user: UserType) => (
                                    <tr key={user.id}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                                                    <User className="h-4 w-4 text-gray-400" />
                                                </div>
                                                <span className="text-white">{user.username}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-300">
                                            {user.email}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span
                                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                                    user.role === "ADMIN"
                                                        ? "bg-purple-500/20 text-purple-400"
                                                        : "bg-blue-500/20 text-blue-400"
                                                }`}
                                            >
                                                {user.role === "ADMIN" ? (
                                                    <Shield className="h-3 w-3" />
                                                ) : (
                                                    <User className="h-3 w-3" />
                                                )}
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-300">
                                            {user.rtmpQuota}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span
                                                className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                                                    user.isActive
                                                        ? "bg-green-500/20 text-green-400"
                                                        : "bg-gray-500/20 text-gray-400"
                                                }`}
                                            >
                                                {user.isActive ? "Active" : "Inactive"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleEditUser(user)}
                                                    className="text-blue-400 hover:text-blue-300"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDeleteUser(user.id)}
                                                    disabled={deleteUserMutation.isPending}
                                                    className="text-red-400 hover:text-red-300"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>

            {/* Modals */}
            <AddUserModal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                onSuccess={handleSuccess}
            />
            <EditUserModal
                isOpen={showEditModal}
                onClose={() => setShowEditModal(false)}
                onSuccess={handleSuccess}
                user={selectedUser}
            />
        </LayoutWrapper>
    );
}
