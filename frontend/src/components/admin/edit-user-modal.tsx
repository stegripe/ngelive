"use client";

import { Key, Mail, RefreshCw, Shield, ToggleLeft, ToggleRight, User, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUpdateUser } from "@/hooks/useUsers";

interface EditUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    user: {
        id: string;
        username: string;
        email: string;
        role: string;
        rtmpQuota: number;
        isActive: boolean;
    } | null;
}

export function EditUserModal({ isOpen, onClose, onSuccess, user }: EditUserModalProps) {
    const [formData, setFormData] = useState({
        username: "",
        email: "",
        role: "USER",
        rtmpQuota: 1,
        isActive: true,
    });
    const [passwordData, setPasswordData] = useState({
        newPassword: "",
        confirmPassword: "",
    });
    const [showPasswordSection, setShowPasswordSection] = useState(false);
    const [passwordError, setPasswordError] = useState("");

    const updateUserMutation = useUpdateUser();

    useEffect(() => {
        if (user) {
            setFormData({
                username: user.username,
                email: user.email,
                role: user.role,
                rtmpQuota: user.rtmpQuota,
                isActive: user.isActive,
            });
            setShowPasswordSection(false);
            setPasswordData({ newPassword: "", confirmPassword: "" });
            setPasswordError("");
        }
    }, [user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        // Validate password if changing
        if (showPasswordSection) {
            if (passwordData.newPassword !== passwordData.confirmPassword) {
                setPasswordError("Passwords do not match");
                return;
            }
            if (passwordData.newPassword.length < 6) {
                setPasswordError("Password must be at least 6 characters");
                return;
            }
        }

        const updateData = {
            ...formData,
            ...(showPasswordSection && passwordData.newPassword
                ? { password: passwordData.newPassword }
                : {}),
        };

        updateUserMutation.mutate(
            { id: user.id, data: updateData },
            {
                onSuccess: () => {
                    onSuccess();
                    onClose();
                },
            }
        );
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        let newValue: string | number | boolean = value;
        if (type === "checkbox") {
            newValue = (e.target as HTMLInputElement).checked;
        } else if (name === "rtmpQuota") {
            newValue = Number.parseInt(value, 10);
        }
        setFormData((prev) => ({
            ...prev,
            [name]: newValue,
        }));
    };

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setPasswordData((prev) => ({
            ...prev,
            [name]: value,
        }));
        setPasswordError("");
    };

    const generateRandomPassword = () => {
        const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
        let password = "";
        for (let i = 0; i < 12; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setPasswordData({
            newPassword: password,
            confirmPassword: password,
        });
    };

    if (!isOpen || !user) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-white">Edit User</h2>
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
                            htmlFor="edit-username"
                            className="block text-sm font-medium text-gray-300 mb-2"
                        >
                            <User className="h-4 w-4 inline mr-2" />
                            Username
                        </label>
                        <Input
                            id="edit-username"
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            required
                            className="w-full"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="edit-email"
                            className="block text-sm font-medium text-gray-300 mb-2"
                        >
                            <Mail className="h-4 w-4 inline mr-2" />
                            Email
                        </label>
                        <Input
                            id="edit-email"
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            className="w-full"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="edit-role"
                            className="block text-sm font-medium text-gray-300 mb-2"
                        >
                            <Shield className="h-4 w-4 inline mr-2" />
                            Role
                        </label>
                        <select
                            id="edit-role"
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
                            htmlFor="edit-rtmp-quota"
                            className="block text-sm font-medium text-gray-300 mb-2"
                        >
                            RTMP Quota
                        </label>
                        <Input
                            id="edit-rtmp-quota"
                            name="rtmpQuota"
                            type="number"
                            min="1"
                            max="10"
                            value={formData.rtmpQuota}
                            onChange={handleChange}
                            className="w-full"
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <label
                            htmlFor="edit-account-status"
                            className="text-sm font-medium text-gray-300"
                        >
                            Account Status
                        </label>
                        <input
                            id="edit-account-status"
                            name="isActive"
                            type="checkbox"
                            checked={formData.isActive}
                            onChange={handleChange}
                            className="hidden"
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() =>
                                setFormData((prev) => ({ ...prev, isActive: !prev.isActive }))
                            }
                            className="flex items-center gap-2"
                            aria-pressed={formData.isActive}
                            aria-labelledby="edit-account-status"
                        >
                            {formData.isActive ? (
                                <>
                                    <ToggleRight className="h-5 w-5 text-green-500" />
                                    <span className="text-green-400">Active</span>
                                </>
                            ) : (
                                <>
                                    <ToggleLeft className="h-5 w-5 text-red-500" />
                                    <span className="text-red-400">Inactive</span>
                                </>
                            )}
                        </Button>
                    </div>

                    {/* Password Reset Section */}
                    <div className="border-t border-gray-600 pt-4">
                        <div className="flex items-center justify-between mb-3">
                            <label
                                htmlFor="edit-new-password"
                                className="text-sm font-medium text-gray-300"
                            >
                                <Key className="h-4 w-4 inline mr-2" />
                                Reset Password
                            </label>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowPasswordSection(!showPasswordSection)}
                                className="text-blue-400 hover:text-blue-300"
                            >
                                {showPasswordSection ? "Cancel" : "Change Password"}
                            </Button>
                        </div>

                        {showPasswordSection && (
                            <div className="space-y-3">
                                <div>
                                    <label
                                        htmlFor="edit-new-password"
                                        className="block text-sm font-medium text-gray-300 mb-2"
                                    >
                                        New Password
                                    </label>
                                    <Input
                                        id="edit-new-password"
                                        name="newPassword"
                                        type="password"
                                        value={passwordData.newPassword}
                                        onChange={handlePasswordChange}
                                        placeholder="Enter new password"
                                        className="w-full"
                                    />
                                </div>
                                <div>
                                    <label
                                        htmlFor="edit-confirm-password"
                                        className="block text-sm font-medium text-gray-300 mb-2"
                                    >
                                        Confirm Password
                                    </label>
                                    <Input
                                        id="edit-confirm-password"
                                        name="confirmPassword"
                                        type="password"
                                        value={passwordData.confirmPassword}
                                        onChange={handlePasswordChange}
                                        placeholder="Confirm new password"
                                        className="w-full"
                                    />
                                </div>

                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={generateRandomPassword}
                                    className="w-full flex items-center gap-2"
                                >
                                    <RefreshCw className="h-4 w-4" />
                                    Generate Random Password
                                </Button>

                                {passwordError && (
                                    <div className="text-red-400 text-sm">{passwordError}</div>
                                )}
                            </div>
                        )}
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
                            disabled={updateUserMutation.isPending}
                            className="flex-1"
                        >
                            {updateUserMutation.isPending ? "Updating..." : "Update User"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
