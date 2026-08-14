import express from "express";
import { getRoleById, getRoles, updateRole } from "../controllers/role.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", protect, getRoles)
router.put("/:id", protect, updateRole);
router.get("/:id", protect, getRoleById);

export default router;