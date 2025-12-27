import fs from "node:fs";
import path from "node:path";
import express, { type NextFunction, type Request, type Response } from "express";
import multer, { type MulterError } from "multer";
import { deleteVideo, getVideo, getVideos, streamVideo, uploadVideo } from "../controllers/video";
import { authenticateToken } from "../middleware/auth";

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Get file size limit from env (default 2GB)
const MAX_FILE_SIZE = Number.parseInt(process.env.MAX_FILE_SIZE || "2147483648", 10);

// Configure multer
const upload = multer({
    dest: uploadsDir,
    limits: {
        fileSize: MAX_FILE_SIZE,
    },
    fileFilter: (_req, file, cb) => {
        const allowedTypes = [
            "video/mp4",
            "video/avi",
            "video/mov",
            "video/wmv",
            "video/quicktime",
        ];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Invalid file type. Only video files are allowed."));
        }
    },
});

// Error handling middleware
const handleUploadError = (
    err: Error | MulterError,
    _req: Request,
    res: Response,
    _next: NextFunction
) => {
    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
            success: false,
            message: `File too large. Maximum size is ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB.`,
        });
    }

    if (err.message === "Invalid file type. Only video files are allowed.") {
        return res.status(400).json({
            success: false,
            message: err.message,
        });
    }

    return res.status(500).json({
        success: false,
        message: `Upload failed: ${err.message}`,
    });
};

// Routes
router.get("/", authenticateToken, getVideos);
router.get("/:id", authenticateToken, getVideo);
router.post("/", authenticateToken, upload.single("video"), handleUploadError, uploadVideo);
router.delete("/:id", authenticateToken, deleteVideo);
router.get("/stream/:id", streamVideo);

export default router;
