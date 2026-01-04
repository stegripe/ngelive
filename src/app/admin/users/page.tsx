"use client";

import { Edit, Plus, Search, Shield, Trash2, User, Users, Zap } from "lucide-react";
import { useState } from "react";
import { AddUserModal } from "@/components/admin/add-user-modal";
import { EditUserModal } from "@/components/admin/edit-user-modal";
import { LayoutWrapper } from "@/components/layout/wrapper";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/loading";
import { useDeleteUser, useUsers } from "@/hooks/useUsers";
import { cn } from "@/lib/utils";

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
    const [searchTerm, setSearchTerm] = useState("");

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

    const filteredUsers = users.filter(
        (user: UserType) =>
            user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase()),
    );

    const adminCount = users.filter((u: UserType) => u.role === "ADMIN").length;
    const activeCount = users.filter((u: UserType) => u.isActive).length;

    if (isLoading) {
        return (
            <LayoutWrapper>
                <div className="flex items-center justify-center h-64">
                    <LoadingSpinner message="Loading users..." />
                </div>
            </LayoutWrapper>
        );
    }

    return (
        <LayoutWrapper>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-white">
                            User Management
                        </h1>
                        <p className="text-gray-400 mt-1">Manage users and their permissions</p>
                    </div>
                    <Button onClick={() => setShowAddModal(true)} className="w-full sm:w-auto">
                        <Plus className="h-4 w-4" />
                        Add User
                    </Button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <Card className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary-500/10 rounded-lg">
                                <Users className="h-5 w-5 text-primary-400" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Total Users</p>
                                <p className="text-xl font-bold text-white">{users.length}</p>
                            </div>
                        </div>
                    </Card>
                    <Card className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-500/10 rounded-lg">
                                <Shield className="h-5 w-5 text-purple-400" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Admins</p>
                                <p className="text-xl font-bold text-white">{adminCount}</p>
                            </div>
                        </div>
                    </Card>
                    <Card className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-500/10 rounded-lg">
                                <User className="h-5 w-5 text-green-400" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Active</p>
                                <p className="text-xl font-bold text-white">{activeCount}</p>
                            </div>
                        </div>
                    </Card>
                    <Card className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-yellow-500/10 rounded-lg">
                                <Zap className="h-5 w-5 text-yellow-400" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Regular Users</p>
                                <p className="text-xl font-bold text-white">
                                    {users.length - adminCount}
                                </p>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Search */}
                <Card className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                            <Input
                                placeholder="Search users by name or email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <div className="text-sm text-gray-400">
                            {filteredUsers.length} of {users.length} users
                        </div>
                    </div>
                </Card>

                {/* Users Table - Desktop */}
                <Card className="hidden md:block overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-800/50 border-b border-gray-700/50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                        User
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                        Email
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                        Role
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                        RTMP Quota
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700/50">
                                {filteredUsers.map((user: UserType) => (
                                    <tr
                                        key={user.id}
                                        className="hover:bg-gray-800/30 transition-colors"
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                                                    <User className="h-5 w-5 text-gray-400" />
                                                </div>
                                                <span className="text-white font-medium">
                                                    {user.username}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-400">
                                            {user.email}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span
                                                className={cn(
                                                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
                                                    user.role === "ADMIN"
                                                        ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                                                        : "bg-primary-500/10 text-primary-400 border-primary-500/20",
                                                )}
                                            >
                                                {user.role === "ADMIN" ? (
                                                    <Shield className="h-3 w-3" />
                                                ) : (
                                                    <User className="h-3 w-3" />
                                                )}
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {user.role === "ADMIN" || user.rtmpQuota === -1 ? (
                                                <span className="text-yellow-400 font-medium">
                                                    Unlimited
                                                </span>
                                            ) : (
                                                <>
                                                    <span className="text-white font-medium">
                                                        {user.rtmpQuota}
                                                    </span>
                                                    <span className="text-gray-500 text-sm">
                                                        {" "}
                                                        streams
                                                    </span>
                                                </>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span
                                                className={cn(
                                                    "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border",
                                                    user.isActive
                                                        ? "bg-green-500/10 text-green-400 border-green-500/20"
                                                        : "bg-gray-500/10 text-gray-400 border-gray-500/20",
                                                )}
                                            >
                                                <span
                                                    className={cn(
                                                        "w-1.5 h-1.5 rounded-full mr-1.5",
                                                        user.isActive
                                                            ? "bg-green-400"
                                                            : "bg-gray-400",
                                                    )}
                                                />
                                                {user.isActive ? "Active" : "Inactive"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleEditUser(user)}
                                                    className="text-gray-400 hover:text-white hover:bg-gray-700"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDeleteUser(user.id)}
                                                    disabled={deleteUserMutation.isPending}
                                                    className="text-gray-400 hover:text-red-400 hover:bg-red-500/10"
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

                {/* Users Cards - Mobile */}
                <div className="md:hidden space-y-4">
                    {filteredUsers.map((user: UserType) => (
                        <Card key={user.id} className="p-4">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center">
                                        <User className="h-6 w-6 text-gray-400" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-white">{user.username}</p>
                                        <p className="text-sm text-gray-400">{user.email}</p>
                                    </div>
                                </div>
                                <span
                                    className={cn(
                                        "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border",
                                        user.role === "ADMIN"
                                            ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                                            : "bg-primary-500/10 text-primary-400 border-primary-500/20",
                                    )}
                                >
                                    {user.role === "ADMIN" ? (
                                        <Shield className="h-3 w-3" />
                                    ) : (
                                        <User className="h-3 w-3" />
                                    )}
                                    {user.role}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="text-sm">
                                        <span className="text-gray-500">Quota: </span>
                                        {user.role === "ADMIN" || user.rtmpQuota === -1 ? (
                                            <span className="text-yellow-400 font-medium">
                                                Unlimited
                                            </span>
                                        ) : (
                                            <span className="text-white font-medium">
                                                {user.rtmpQuota}
                                            </span>
                                        )}
                                    </div>
                                    <span
                                        className={cn(
                                            "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                                            user.isActive
                                                ? "bg-green-500/10 text-green-400"
                                                : "bg-gray-500/10 text-gray-400",
                                        )}
                                    >
                                        {user.isActive ? "Active" : "Inactive"}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleEditUser(user)}
                                        className="text-gray-400 hover:text-white"
                                    >
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDeleteUser(user.id)}
                                        disabled={deleteUserMutation.isPending}
                                        className="text-gray-400 hover:text-red-400"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
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
