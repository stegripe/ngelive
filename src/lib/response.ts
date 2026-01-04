import { NextResponse } from "next/server";

// Helper function to serialize BigInt
const serializeBigInt = (obj: unknown): unknown => {
    return JSON.parse(
        JSON.stringify(obj, (_key, value) => (typeof value === "bigint" ? Number(value) : value))
    );
};

export function sendSuccess(data: unknown, message = "Success", statusCode = 200) {
    const serializedData = serializeBigInt(data);
    return NextResponse.json(
        {
            success: true,
            message,
            data: serializedData,
        },
        { status: statusCode }
    );
}

export function sendError(message = "Error", statusCode = 500) {
    return NextResponse.json(
        {
            success: false,
            message,
            data: null,
        },
        { status: statusCode }
    );
}
