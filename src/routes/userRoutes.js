import express from "express";
import multer from "multer";
import {
  acceptInvite,
  archiveUser,
  assignManager,
  bulkInvitesUsers,
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
  getUserDevices,
  getUsers,
  importUsers,
  inviteUser,
  requestEmailChange,
  resendInvite,
  unarchiveUser,
  updateInviteRole,
  updateUser,
  updateUserEmail,
  updateUserRole,
  verifyEmailChange,
} from "../controllers/user.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/authorizeRoles.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.get(
  "/",
  protect,
  authorizeRoles("owner", "admin", "'manager"),
  getUsers,
);
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

router.get("/:id/devices", protect, getUserDevices);

router.put("/:id", protect, updateUser);

router.delete("/:id", protect, authorizeRoles("owner"), deleteUser);

router.put(
  "/:id/role",
  protect,
  authorizeRoles("owner", "admin"),
  updateUserRole,
);

router.put("/:id/assign-manager", protect, assignManager);

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

router.get("/all-users", protect, getAllUsersWithInvites);

export default router;
