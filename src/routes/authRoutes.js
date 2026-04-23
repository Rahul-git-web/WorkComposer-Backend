import express from "express";
import {
  registerUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
} from "../controllers/auth.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/register", registerUser);

router.post("/login", loginUser);

router.post("/refresh", refreshAccessToken);

router.post("/logout", logoutUser);

router.get("/verify/:token", verifyEmail);

router.post("/resend-verification", resendVerification);

router.get("/me", protect, (req, res) => {
  res.json(req.user);
});

router.post("/forgot-password", forgotPassword);

router.post("/reset-password", resetPassword);

export default router;
