import mongoose from "mongoose";

const timerSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      default: null,
    },

    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      default: null,
    },

    startTime: {
      type: Date,
    },

    endTime: {
      type: Date,
    },

    duration: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: ["running", "stopped"],
      default: "stopped",
    },
  },
  {
    timestamps: true,
  },
);

const Timer = mongoose.model("Timer", timerSchema);

export default Timer;
