import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  getActivity,
  getActivityTimeline,
  getSessionDetails,
  trackActivity,
} from "../controllers/activity.controller.js";

const router = express.Router();

router.post("/", protect, trackActivity);

router.get("/session-details", protect, getSessionDetails);

router.get("/:userId", protect, getActivity);

router.get("/timeline/:userId", protect, getActivityTimeline);

export default router;
