import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import { getSyncStatus } from "../controllers/sync.controller.js";

const router = express.Router();

router.get("/status", protect, getSyncStatus);

export default router;
