import Comment from "../models/comment.model.js";
import Task from "../models/task.model.js";

export const addComment = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { content } = req.body;

    if (!content?.trim()) {
      return res.status(400).json({
        message: "Comment cannot be empty",
      });
    }

    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

const comment = await Comment.create({
  task: taskId,
  user: req.user._id,
  content: content.trim(),
  readBy: [req.user._id],
});

    const populatedComment = await Comment.findById(comment._id).populate(
      "user",
      "_id firstName lastName avatar",
    );

    res.status(201).json(populatedComment);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to add comment",
    });
  }
};

export const getComments = async (req, res) => {
  try {
    const { taskId } = req.params;

    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    const comments = await Comment.find({
      task: taskId,
    })
      .populate("user", "_id firstName lastName avatar")
      .sort({ createdAt: 1 });

    res.json(comments);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to fetch comments",
    });
  }
};

export const getUnreadCommentCount = async (req, res) => {
  try {
    const { taskId } = req.params;

    const count = await Comment.countDocuments({
      task: taskId,
      user: { $ne: req.user._id },
      $or: [
        { readBy: { $exists: false } },
        { readBy: { $nin: [req.user._id] } },
      ],
    });

    return res.json({
      count,
    });
  } catch (error) {
    console.error("GET UNREAD COMMENT COUNT ERROR:", error);

    return res.status(500).json({
      message: "Failed to fetch unread comment count",
    });
  }
};

export const markCommentsAsRead = async (req, res) => {
  try {
    const { taskId } = req.params;

    await Comment.updateMany(
      {
        task: taskId,
        readBy: { $nin: [req.user._id] },
      },
      {
        $addToSet: {
          readBy: req.user._id,
        },
      },
    );

    return res.json({
      message: "Comments marked as read",
    });
  } catch (error) {
    console.error("MARK COMMENTS AS READ ERROR:", error);

    return res.status(500).json({
      message: "Failed to mark comments as read",
    });
  }
};

export const updateComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;

    if (!content?.trim()) {
      return res.status(400).json({
        message: "Comment cannot be empty",
      });
    }

    const comment = await Comment.findById(commentId);

    if (!comment) {
      return res.status(404).json({
        message: "Comment not found",
      });
    }

    if (comment.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "You can only edit your own comments",
      });
    }

    comment.content = content.trim();
    comment.edited = true;

    await comment.save();

    const updatedComment = await Comment.findById(comment._id).populate(
      "user",
      "_id firstName lastName avatar",
    );

    res.json(updatedComment);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to update comment",
    });
  }
};

export const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;

    const comment = await Comment.findById(commentId);

    if (!comment) {
      return res.status(404).json({
        message: "Comment not found",
      });
    }

    if (comment.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "You can only delete your own comments",
      });
    }

    await Comment.findByIdAndDelete(commentId);

    res.json({
      message: "Comment deleted successfully",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to delete comment",
    });
  }
};
