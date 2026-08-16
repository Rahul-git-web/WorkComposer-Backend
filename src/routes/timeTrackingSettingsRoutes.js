import express from "express";

import {
  getEffectiveTimeTrackingSettings,
  getTimeTrackingSettings,
  updateTimeTrackingSettings,
} from "../controllers/timeTrackingSettings.controller.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get(
  "/settings",
  protect,
  requirePermission("manage_settings"),
  getTimeTrackingSettings,
);

router.put(
  "/settings",
  protect,
  requirePermission("manage_settings"),
  updateTimeTrackingSettings,
);

router.get("/settings/effective", protect, getEffectiveTimeTrackingSettings);

export default router;
