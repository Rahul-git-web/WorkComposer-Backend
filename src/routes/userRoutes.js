import express from "express";
import {
  acceptInvite,
  bulkInvitesUsers,
  deleteUser,
  getAllUsersWithInvites,
  getInviteDetails,
  getInvites,
  getUsers,
  inviteUser,
  resendInvite,
  updateUserRole,
} from "../controllers/user.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/authorizeRoles.js";

const router = express.Router();

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
router.post("/accept-invite", acceptInvite);

router.get("/invite/:token", getInviteDetails);

router.get(
  "/invites",
  protect,
  authorizeRoles("owner", "admin", "manager"),
  getInvites,
);

router.post("/bulk-invite", protect, authorizeRoles("owner"), bulkInvitesUsers);

router.delete("/:id", protect, authorizeRoles("owner"), deleteUser);

router.patch(
  "/:id/role",
  protect,
  authorizeRoles("owner", "admin"),
  updateUserRole,
);

router.post(
  "/resend-invite",
  protect,
  authorizeRoles("owner", "admin"),
  resendInvite,
);

router.get("/all-users", protect, getAllUsersWithInvites);



export default router;
