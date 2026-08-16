import express from "express";
import {
  createSession,
  deleteSessionsInRange,
  getLast30DaysChart,
  getOverviewData,
  getSessions,
  getTodayChartData,
  getTodaySummary,
  getTodayTaskSummary,
  getWorkTimeStats,
  previewSessionsInRange,
} from "../controllers/session.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/create", protect, createSession);
router.get("/", protect, getSessions);
router.delete("/delete-range", protect, deleteSessionsInRange);
router.get("/preview-range", protect, previewSessionsInRange);
router.get("/overview", protect, getOverviewData);
router.get("/today", protect, getTodaySummary);
router.get("/today-task-summary", protect, getTodayTaskSummary);
router.get("/stats", protect, getWorkTimeStats);
router.get("/today-chart", protect, getTodayChartData);
router.get("/last-30-days-chart", protect, getLast30DaysChart);

export default router;
