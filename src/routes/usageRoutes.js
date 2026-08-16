import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  getTopApps,
  getUsageData,
  getUsageDetails,
  trackAppUsage,
} from "../controllers/usage.controller.js";

const router = express.Router();

router.get("/", protect, getUsageData);

router.post("/track", protect, trackAppUsage);

router.get("/top-apps/:userId", protect, getTopApps);

router.get("/details/:userId", protect, getUsageDetails);

export default router;
