import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  getManualTimeSettings,
  updateManualTimeSettings,
} from "../controllers/manualTime.controller.js";
import { requirePermission } from "../middleware/permission.middleware.js";

const router = express.Router();

router.get(
  "/settings",
  protect,
  requirePermission("manage_settings"),
  getManualTimeSettings,
);

router.put(
  "/settings",
  protect,
  requirePermission("manage_settings"),
  updateManualTimeSettings,
);

export default router;
