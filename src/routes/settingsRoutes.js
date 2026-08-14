import express from "express";
import { uploadAvatar as uploadAvatarMiddleware } from "../middleware/avatarUpload.middleware.js";
import { protect } from "../middleware/auth.middleware.js";
import {
  changePassword,
  updatePreferences,
  updateProfile,
  uploadAvatar,
} from "../controllers/settings.controller.js";

const router = express.Router();

router.put("/profile", protect, updateProfile);

router.put("/change-password", protect, changePassword);

router.put("/preferences", protect, updatePreferences);

router.post(
  "/avatar",
  protect,
  uploadAvatarMiddleware.single("avatar"),
  uploadAvatar
);

export default router;
