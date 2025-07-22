import { toast } from "sonner";

class ToastManager {
    private activeToasts = new Set<string>();
    private toastTimeout = 100; // 100ms delay to prevent duplicates

    success(message: string, id?: string) {
        const toastId = id || `success-${Date.now()}`;

        if (this.activeToasts.has(toastId)) {
            return;
        }

        this.activeToasts.add(toastId);

        setTimeout(() => {
            toast.success(message, {
                id: toastId,
                onDismiss: () => this.activeToasts.delete(toastId),
                onAutoClose: () => this.activeToasts.delete(toastId),
            });
        }, this.toastTimeout);
    }

    error(message: string, id?: string) {
        const toastId = id || `error-${Date.now()}`;

        if (this.activeToasts.has(toastId)) {
            return;
        }

        this.activeToasts.add(toastId);

        setTimeout(() => {
            toast.error(message, {
                id: toastId,
                onDismiss: () => this.activeToasts.delete(toastId),
                onAutoClose: () => this.activeToasts.delete(toastId),
            });
        }, this.toastTimeout);
    }

    dismiss(id: string) {
        toast.dismiss(id);
        this.activeToasts.delete(id);
    }

    clear() {
        this.activeToasts.clear();
        toast.dismiss();
    }
}

export const toastManager = new ToastManager();
