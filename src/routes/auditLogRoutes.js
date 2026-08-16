import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import { getAuditLogs } from "../controllers/auditLog.controller.js";

const router = express.Router();

router.get("/", protect, getAuditLogs);

export default router;