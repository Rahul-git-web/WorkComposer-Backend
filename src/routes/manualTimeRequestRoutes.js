import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  approveRequest,
  createRequest,
  getPendingCount,
  getRequests,
  rejectRequest,
} from "../controllers/manualTimeRequest.controller.js";

const router = express.Router();

router.post("/", protect, createRequest);
router.get("/", protect, getRequests);
router.patch("/:id/approve", protect, approveRequest);
router.patch("/:id/reject", protect, rejectRequest);
router.get("/count", protect, getPendingCount);

export default router;
