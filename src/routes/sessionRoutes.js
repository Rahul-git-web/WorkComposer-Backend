import express from "express";
import {
  createSession,
  deleteSessionsInRange,
  getSessions,
  previewSessionsInRange,
} from "../controllers/session.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/create", protect, createSession);
router.get("/", protect, getSessions);
router.delete("/delete-range",protect, deleteSessionsInRange);
router.get("/preview-range",protect, previewSessionsInRange);

export default router;
