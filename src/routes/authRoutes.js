import express from "express";
import User from "../models/user.model.js";
import {
  registerUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  verifyTwoFactor,
  googleCallback,
  googleLogin,
  getGoogleSignupInfo,
  microsoftLogin,
  microsoftCallback,
  getMicrosoftSignupInfo,
} from "../controllers/auth.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { getUserPermissions } from "../utils/getUserPermissions.js";
import Role from "../models/role.model.js";

const router = express.Router();

router.post("/register", registerUser);

router.post("/login", loginUser);

router.get("/google", googleLogin);

router.get("/google/callback", googleCallback);

router.get("/google-signup-info", getGoogleSignupInfo);

router.get("/microsoft", microsoftLogin);

router.get("/microsoft/callback", microsoftCallback);

router.get("/microsoft-signup-info", getMicrosoftSignupInfo);

router.post("/refresh", refreshAccessToken);

router.post("/logout", logoutUser);

router.get("/verify/:token", verifyEmail);

router.post("/resend-verification", resendVerification);

router.get("/me", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate("organization", "name timezone")
      .populate("reportTeam")
      .select("-password -refreshToken");

    const userObj = user.toObject();

    const permissions = await getUserPermissions(user);

    userObj.permissions = permissions;

    const role = await Role.findById(user.roleRef).select(
      "reportAccess screenshotAccess",
    );

    userObj.reportAccess = role?.reportAccess || "none";
    userObj.screenshotAccess = role?.screenshotAccess || "none";

    if (
      userObj.avatar &&
      !userObj.avatar.startsWith("http://") &&
      !userObj.avatar.startsWith("https://")
    ) {
      userObj.avatar = `${process.env.BACKEND_URL}/${userObj.avatar}`;
    }

    res.json(userObj);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Failed to load user",
    });
  }
});

router.post("/forgot-password", forgotPassword);

router.post("/reset-password", resetPassword);

router.post("/verify-two-factor", verifyTwoFactor);

export default router;
