import { Router } from "express";
import {
    addVideoToStream,
    assignVideosToStream,
    createRtmpStream,
    deleteRtmpStream,
    getRtmpStreamById,
    getRtmpStreams,
    removeVideoFromStream,
    reorderStreamVideos,
    startStream,
    stopStream,
    updateRtmpStream,
} from "../controllers/rtmp";
import { authenticateToken } from "../middleware/auth";

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// RTMP stream routes
router.get("/", getRtmpStreams);
router.get("/:id", getRtmpStreamById);
router.post("/", createRtmpStream);
router.put("/:id", updateRtmpStream);
router.delete("/:id", deleteRtmpStream);

// Stream control routes
router.post("/:id/start", startStream);
router.post("/:id/stop", stopStream);
router.post("/:id/assign-videos", assignVideosToStream);

// Individual video management
router.post("/:id/videos", addVideoToStream);
router.delete("/:id/videos/:videoId", removeVideoFromStream);
router.put("/:id/videos/reorder", reorderStreamVideos);

export default router;
