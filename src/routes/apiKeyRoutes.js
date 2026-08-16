import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  generateApiKey,
  getApiKeys,
  updateApiKey,
  deleteApiKey,
} from "../controllers/apiKey.controller.js";
import { requirePermission } from "../middleware/permission.middleware.js";

const router = express.Router();

router.get("/", protect, requirePermission("manage_settings"), getApiKeys);
router.post("/", protect, requirePermission("manage_settings"), generateApiKey);
router.patch(
  "/:id",
  protect,
  requirePermission("manage_settings"),
  updateApiKey,
);
router.delete(
  "/:id",
  protect,
  requirePermission("manage_settings"),
  deleteApiKey,
);

export default router;
