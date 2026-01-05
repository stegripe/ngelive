import bcrypt from "bcryptjs";
import { type NextRequest } from "next/server";
import { generateToken } from "@/lib/jwt";
import prisma from "@/lib/prisma";
import { sendError, sendSuccess } from "@/lib/response";
import { validateEmail, validateRequired } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email, password } = body;

        const validationErrors = validateRequired(body, ["email", "password"]);
        if (validationErrors.length > 0) {
            return sendError(validationErrors.join(", "), 400);
        }

        if (!validateEmail(email)) {
            return sendError("Invalid email format", 400);
        }

        const user = await prisma.user.findUnique({
            where: { email },
            select: {
                id: true,
                email: true,
                username: true,
                password: true,
                role: true,
                isActive: true,
                rtmpQuota: true,
            },
        });

        if (!user) {
            return sendError("Invalid email or password", 401);
        }

        if (!user.isActive) {
            return sendError("Account is deactivated", 401);
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return sendError("Invalid email or password", 401);
        }

        const token = generateToken({
            userId: user.id,
            email: user.email,
            role: user.role,
        });

        return sendSuccess(
            {
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    username: user.username,
                    role: user.role,
                    rtmpQuota: user.rtmpQuota,
                },
            },
            "Login successful",
        );
    } catch (error) {
        console.error("Login error:", error);
        return sendError("Login failed", 500);
    }
}
