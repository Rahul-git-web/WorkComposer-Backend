import express from "express";
import multer from "multer";
import { protect } from "../middleware/auth.middleware.js";
import {
  deleteOrganization,
  getOrganization,
  getTwoFactorSettings,
  updateOrganization,
  updateTwoFactorSettings,
  updateAppUpdateSettings,
  uploadLogo,
  getAppUpdateSettings,
  updateEmailReportSettings,
  getEmailReportSettings,
  getTaskManagementSettings,
  updateTaskManagementSettings,
} from "../controllers/organization.controller.js";
import { requirePermission } from "../middleware/permission.middleware.js";

const router = express.Router();

const upload = multer({
  dest: "uploads/",
});

router.get("/", protect, requirePermission("manage_settings"), getOrganization);

router.put(
  "/",
  protect,
  requirePermission("manage_settings"),
  updateOrganization,
);

router.post(
  "/upload-logo",
  protect,
  requirePermission("manage_settings"),
  upload.single("logo"),
  uploadLogo,
);

router.delete(
  "/",
  protect,
  requirePermission("manage_settings"),
  deleteOrganization,
);

router.get(
  "/two-factor",
  protect,
  requirePermission("manage_settings"),
  getTwoFactorSettings,
);

router.put(
  "/two-factor",
  protect,
  requirePermission("manage_settings"),
  updateTwoFactorSettings,
);

router.get(
  "/app-updates",
  protect,
  requirePermission("manage_settings"),
  getAppUpdateSettings,
);

router.put(
  "/app-updates",
  protect,
  requirePermission("manage_settings"),
  updateAppUpdateSettings,
);

router.get(
  "/email-reports",
  protect,
  requirePermission("manage_settings"),
  getEmailReportSettings,
);

router.put(
  "/email-reports",
  protect,
  requirePermission("manage_settings"),
  updateEmailReportSettings,
);

router.get(
  "/task-management",
  protect,
  requirePermission("manage_settings"),
  getTaskManagementSettings,
);

router.put(
  "/task-management",
  protect,
  requirePermission("manage_settings"),
  updateTaskManagementSettings,
);

export default router;
