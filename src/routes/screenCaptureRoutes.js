import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  getScreenCaptureSettings,
  updateScreenCaptureSettings,
} from "../controllers/screenCapture.controller.js";
import { requirePermission } from "../middleware/permission.middleware.js";

const router = express.Router();

router.get("/settings", protect, requirePermission("manage_settings"), getScreenCaptureSettings);

router.put("/settings", protect, requirePermission("manage_settings"), updateScreenCaptureSettings);

export default router;
