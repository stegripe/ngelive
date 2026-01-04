import { type NextRequest, NextResponse } from "next/server";
import { verifyToken, type JwtPayload } from "./jwt";

export interface AuthenticatedRequest extends NextRequest {
    user?: JwtPayload;
}

export async function getAuthUser(request: NextRequest): Promise<JwtPayload | null> {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.split(" ")[1];

    if (!token) {
        return null;
    }

    try {
        const decoded = verifyToken(token);
        return decoded;
    } catch {
        return null;
    }
}

export function requireAuth(user: JwtPayload | null): NextResponse | null {
    if (!user) {
        return NextResponse.json(
            { success: false, message: "Access token required", data: null },
            { status: 401 }
        );
    }
    return null;
}

export function requireAdmin(user: JwtPayload | null): NextResponse | null {
    const authError = requireAuth(user);
    if (authError) return authError;

    if (user?.role !== "ADMIN") {
        return NextResponse.json(
            { success: false, message: "Admin access required", data: null },
            { status: 403 }
        );
    }
    return null;
}
