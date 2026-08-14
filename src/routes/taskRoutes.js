import express from "express";
import {
  createTask,
  deleteMultipleTasks,
  deleteTask,
  getRecentlyDeletedTasks,
  getTasks,
  permanentlyDeleteTask,
  restoreTask,
  updateTask,
} from "../controllers/task.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/authorizeRoles.js";

const router = express.Router();

router.post("/", protect, createTask);
router.get("/", protect, getTasks);
router.get("/recently-deleted", protect, getRecentlyDeletedTasks);
router.patch("/recently-deleted/:id/restore", protect, restoreTask);
router.delete("/recently-deleted/:id", protect, permanentlyDeleteTask);
router.delete(
  "/delete-multiple",
  protect,
  authorizeRoles("owner", "admin"),
  deleteMultipleTasks,
);
router.put("/:id", protect, updateTask);
router.delete("/:id", protect, deleteTask);

export default router;
