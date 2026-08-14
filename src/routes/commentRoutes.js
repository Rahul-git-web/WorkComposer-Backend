import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  addComment,
  deleteComment,
  getComments,
  getUnreadCommentCount,
  markCommentsAsRead,
  updateComment,
} from "../controllers/comment.controller.js";

const router = express.Router();

router.get("/:taskId/comments", protect, getComments);
router.post("/:taskId/comments", protect, addComment);
router.put("/comment/:commentId", protect, updateComment);
router.delete("/comment/:commentId", protect, deleteComment);
router.get("/:taskId/comments/unread-count", protect, getUnreadCommentCount);
router.patch("/:taskId/comments/read", protect, markCommentsAsRead);

export default router;
