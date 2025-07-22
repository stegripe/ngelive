export const validateRequired = (data: Record<string, unknown>, fields: string[]): string[] => {
    const errors: string[] = [];

    for (const field of fields) {
        if (!data[field] || (typeof data[field] === "string" && data[field].trim() === "")) {
            errors.push(`${field} is required`);
        }
    }

    return errors;
};

export const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

export const validateVideoFile = (file: File): string[] => {
    const errors: string[] = [];
    const allowedTypes = [".mp4", ".avi", ".mkv", ".mov", ".wmv"];
    const maxSize = Number(process.env.MAX_FILE_SIZE) || 2147483648; // 2GB

    if (!file) {
        errors.push("Video file is required");
        return errors;
    }

    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf("."));
    if (!allowedTypes.includes(fileExtension)) {
        errors.push(
            `File type ${fileExtension} is not allowed. Allowed types: ${allowedTypes.join(", ")}`
        );
    }

    if (file.size > maxSize) {
        errors.push(`File size exceeds limit of ${maxSize / (1024 * 1024 * 1024)}GB`);
    }

    return errors;
};
