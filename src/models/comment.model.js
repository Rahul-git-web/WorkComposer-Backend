import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: true,
      index: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    content: {
      type: String,
      required: true,
      trim: true,
    },

    edited: {
      type: Boolean,
      default: false,
    },

    readBy: [
  {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
],
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("Comment", commentSchema);
