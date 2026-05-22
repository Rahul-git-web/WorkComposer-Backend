import express from "express";
import {
  createProject,
  deleteProject,
  getProjects,
  updateProject,
} from "../controllers/project.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", protect, createProject);

router.get("/", protect, getProjects);

router.put("/:id", protect, updateProject);

router.delete("/:id", protect, deleteProject);

export default router;
