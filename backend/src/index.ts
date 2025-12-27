import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import helmet from "helmet";
import morgan from "morgan";
import authRoutes from "./routes/auth";
import rtmpRoutes from "./routes/rtmp";
import userRoutes from "./routes/user";
import videoRoutes from "./routes/video";

const app = express();

// Increase payload limits
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// CORS configuration
app.use(
    cors({
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        credentials: true,
    })
);

// Security middleware
app.use(helmet());

// Logging
app.use(morgan("combined"));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/rtmp", rtmpRoutes);
app.use("/api/videos", videoRoutes);

// Error handling middleware
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Global error handler:", err);
    res.status(500).json({
        success: false,
        message: "Internal server error",
    });
});

// Health check
app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
    console.info(`🚀 ngelive server running on port ${PORT}`);
    console.info("📱 by Stegripe Development");
});
