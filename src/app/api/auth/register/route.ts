import bcrypt from "bcryptjs";
import { type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { sendError, sendSuccess } from "@/lib/response";
import { validateEmail, validateRequired } from "@/lib/validation";

// POST /api/auth/register
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email, username, password, confirmPassword } = body;

        const validationErrors = validateRequired(body, [
            "email",
            "username",
            "password",
            "confirmPassword",
        ]);
        if (validationErrors.length > 0) {
            return sendError(validationErrors.join(", "), 400);
        }

        if (!validateEmail(email)) {
            return sendError("Invalid email format", 400);
        }

        if (password !== confirmPassword) {
            return sendError("Passwords do not match", 400);
        }

        if (password.length < 6) {
            return sendError("Password must be at least 6 characters", 400);
        }

        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [{ email }, { username }],
            },
        });

        if (existingUser) {
            return sendError("Email or username already exists", 400);
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                email,
                username,
                password: hashedPassword,
                role: "USER",
                rtmpQuota: 1,
            },
            select: {
                id: true,
                email: true,
                username: true,
                role: true,
                rtmpQuota: true,
                createdAt: true,
            },
        });

        return sendSuccess({ user }, "Registration successful", 201);
    } catch (error) {
        console.error("Registration error:", error);
        return sendError("Registration failed", 500);
    }
}
