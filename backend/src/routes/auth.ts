import { Router } from "express";
import { getProfile, login, register, updateProfile } from "../controllers/auth";
import { authenticateToken } from "../middleware/auth";

const router = Router();

// Public routes
router.post("/login", login);
router.post("/register", register);

// Protected routes
router.get("/profile", authenticateToken, getProfile);
router.put("/profile", authenticateToken, updateProfile);

export default router;
