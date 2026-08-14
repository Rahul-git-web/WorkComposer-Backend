import mongoose from "mongoose";

const appUsageSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    appName: {
      type: String,
      required: true,
    },

    windowTitle: {
      type: String,
      default: "",
    },

    duration: {
      type: Number,
      default: 0,
    },

    date: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("AppUsage", appUsageSchema);
