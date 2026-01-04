export const validateRequired = (data: Record<string, unknown>, fields: string[]): string[] => {
    const errors: string[] = [];

    for (const field of fields) {
        if (
            !data[field] ||
            (typeof data[field] === "string" && (data[field] as string).trim() === "")
        ) {
            errors.push(`${field} is required`);
        }
    }

    return errors;
};

export const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

export const validateVideoFile = (filename: string, size: number): string[] => {
    const errors: string[] = [];
    const allowedTypes = [".mp4", ".avi", ".mkv", ".mov", ".wmv"];
    const maxSize = Number(globalThis.process.env.MAX_FILE_SIZE) || 2147483648; // 2GB

    const fileExtension = filename.toLowerCase().substring(filename.lastIndexOf("."));
    if (!allowedTypes.includes(fileExtension)) {
        errors.push(
            `File type ${fileExtension} is not allowed. Allowed types: ${allowedTypes.join(", ")}`,
        );
    }

    if (size > maxSize) {
        errors.push(`File size exceeds limit of ${maxSize / (1024 * 1024 * 1024)}GB`);
    }

    return errors;
};
