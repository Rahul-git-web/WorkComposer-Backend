import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  getProjectTracking,
  getTaskDetails,
  trackProject,
} from "../controllers/projectTracking.controller.js";

const router = express.Router();

router.post("/track", protect, trackProject);

router.get("/", protect, getProjectTracking);

router.get("/task/:taskId", protect, getTaskDetails);

export default router;
