import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import { getApiLogs } from "../controllers/apiLog.controller.js";
import { requirePermission } from "../middleware/permission.middleware.js";

const router = express.Router();

router.get("/", protect, requirePermission("manage_settings"), getApiLogs);

export default router;
