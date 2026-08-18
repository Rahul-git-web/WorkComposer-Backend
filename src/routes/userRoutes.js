import express from "express";
import { requirePermission } from "../middleware/permission.middleware.js";
import multer from "multer";
import {
  acceptInvite,
  archiveUser,
  assignManager,
  bulkInvitesUsers,
  checkUserDevice,
  createUser,
  deleteUser,
  exportDevices,
  exportManagersHierarchy,
  exportUsers,
  exportUsersCsv,
  exportUsersHierarchy,
  getAllUsersWithInvites,
  getInviteDetails,
  getInvites,
  getManagerAssignments,
  getUserDevices,
  getUsers,
  importUsers,
  inviteUser,
  logoutUserDevice,
  registerUserDevice,
  requestEmailChange,
  resendInvite,
  unarchiveUser,
  updateInviteRole,
  updateUser,
  updateUserDeviceTracking,
  updateUserEmail,
  updateUserRole,
  updateUserSetting,
  updateUserShiftSettings,
  verifyEmailChange,
} from "../controllers/user.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/authorizeRoles.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.get("/", protect, authorizeRoles("owner", "admin", "manager"), getUsers);

router.post(
  "/invite",
  protect,
  authorizeRoles("owner", "admin", "manager"),
  inviteUser,
);

router.post(
  "/create-user",
  protect,
  authorizeRoles("owner", "admin", "manager"),
  createUser,
);

router.post("/accept-invite", acceptInvite);

router.get("/invite/:token", getInviteDetails);

router.get(
  "/invites",
  protect,
  authorizeRoles("owner", "admin", "manager"),
  getInvites,
);

router.post("/bulk-invite", protect, authorizeRoles("owner"), bulkInvitesUsers);

router.get("/export/users", protect, exportUsersCsv);

router.get(
  "/export/hierarchy-users",
  protect,
  authorizeRoles("owner", "admin"),
  exportUsersHierarchy,
);

router.get(
  "/export/hierarchy-managers",
  protect,
  authorizeRoles("owner", "admin"),
  exportManagersHierarchy,
);

router.get(
  "/export/devices",
  protect,
  authorizeRoles("owner", "admin"),
  exportDevices,
);

router.post(
  "/import-users",
  protect,
  authorizeRoles("owner", "admin"),
  upload.single("file"),
  importUsers,
);

router.get(
  "/export-users",
  protect,
  authorizeRoles("owner", "admin"),
  exportUsers,
);

router.put("/:id/email-request", protect, requestEmailChange);

router.get("/verify-email-change/:token", verifyEmailChange);

// router.put("/:id/email", protect, updateUserEmail);

router.put("/:id/archive", protect, archiveUser);

router.put("/:id/unarchive", protect, unarchiveUser);

router.post("/device", protect, registerUserDevice);

router.get("/device/:deviceId/status", protect, checkUserDevice);

router.post("/device/:deviceId/tracking", protect, updateUserDeviceTracking);

router.get("/:id/devices", protect, getUserDevices);

router.post("/:id/devices/:deviceId/logout", protect, logoutUserDevice);

router.put("/:id", protect, updateUser);

router.delete("/:id", protect, authorizeRoles("owner"), deleteUser);

router.put(
  "/:id/role",
  protect,
  authorizeRoles("owner", "admin"),
  updateUserRole,
);

router.put(
  "/:id/configure-setting",
  protect,
  authorizeRoles("owner", "admin"),
  updateUserSetting,
);

router.patch("/:id/shift-settings", protect, updateUserShiftSettings);

router.put("/:id/assign-manager", protect, assignManager);

router.get("/:id/manager-assignments", protect, getManagerAssignments);

router.put(
  "/invite/:id/role",
  protect,
  authorizeRoles("owner", "admin"),
  updateInviteRole,
);

router.post(
  "/resend-invite",
  protect,
  authorizeRoles("owner", "admin"),
  resendInvite,
);

router.get(
  "/all-users",
  protect,
  requirePermission("manage_users"),
  getAllUsersWithInvites,
);
export default router;
