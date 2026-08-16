import mongoose from "mongoose";

const screenshotSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
    },

    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
    },

    imageUrl: {
      type: String,
      required: true,
    },

    publicId: {
      type: String,
      required: true,
    },

    capturedAt: {
      type: Date,
      default: Date.now,
    },

    appName: {
      type: String,
      default: "",
    },

    windowTitle: {
      type: String,
      default: "",
    },

    keyPresses: {
      type: Number,
      default: 0,
    },

    mouseClicks: {
      type: Number,
      default: 0,
    },

    mouseMoves: {
      type: Number,
      default: 0,
    },

    activityScore: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

export default mongoose.model("Screenshot", screenshotSchema);
