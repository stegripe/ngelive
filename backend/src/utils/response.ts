import { type Response } from "express";

// Helper function to serialize BigInt
const serializeBigInt = (obj: unknown): unknown => {
    return JSON.parse(
        JSON.stringify(obj, (_key, value) => (typeof value === "bigint" ? Number(value) : value))
    );
};

export const sendSuccess = (
    res: Response,
    data: unknown,
    message = "Success",
    statusCode = 200
) => {
    const serializedData = serializeBigInt(data);
    res.status(statusCode).json({
        success: true,
        message,
        data: serializedData,
    });
};

export const sendError = (res: Response, message = "Error", statusCode = 500) => {
    res.status(statusCode).json({
        success: false,
        message,
        data: null,
    });
};
