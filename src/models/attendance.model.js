import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },

    date: {
      type: Date,
      required: true,
    },

    workTime: {
      type: Number,
      default: 0,
    },

    breakTime: {
      type: Number,
      default: 0,
    },

    startTime: Date,
    finishTime: Date,
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("Attendance", attendanceSchema);
