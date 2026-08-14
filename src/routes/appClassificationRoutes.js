import express from "express";
import { protect } from "../middleware/auth.middleware.js";

import {
  getAppClassifications,
  createAppClassification,
  updateAppClassification,
  deleteAppClassification,
  getClassificationStats,
  checkBreakMode,
} from "../controllers/appClassification.controller.js";
import { requirePermission } from "../middleware/permission.middleware.js";

const router = express.Router();

router.get(
  "/",
  protect,
  requirePermission("manage_settings"),
  getAppClassifications,
);

router.get(
  "/stats",
  protect,
  requirePermission("manage_settings"),
  getClassificationStats,
);

router.post(
  "/",
  protect,
  requirePermission("manage_settings"),
  createAppClassification,
);

router.put(
  "/:id",
  protect,
  requirePermission("manage_settings"),
  updateAppClassification,
);

router.delete(
  "/:id",
  protect,
  requirePermission("manage_settings"),
  deleteAppClassification,
);

router.get(
  "/check-break-mode",
  protect,
  requirePermission("manage_settings"),
  checkBreakMode,
);

export default router;
