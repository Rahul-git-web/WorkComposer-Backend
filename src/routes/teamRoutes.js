import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/authorizeRoles.js";
import {
  createTeam,
  deleteTeam,
  getTeams,
  updateTeam,
} from "../controllers/team.controller.js";

const router = express.Router();

router.post("/", protect, authorizeRoles("owner", "admin"), createTeam);

router.get("/", protect, getTeams);

router.put("/:id", protect, updateTeam);

router.delete("/:id", protect, deleteTeam);

export default router;
