import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    type: {
      type: String,
      enum: [
        "attendance-overview",
        "attendance-detailed",
        "productivity",
        "usage",
        "project-user",
        "project",

        // Time tracking reports
        "manual-work-time",
        "manual-break-time",
        "removed-time",
      ],
      required: true,
    },

    status: {
      type: String,
      enum: ["processing", "done", "failed"],
      default: "processing",
    },

    fileUrl: {
      type: String,
      default: "",
    },

    generatedAt: {
      type: Date,
      default: null,
    },

    startDate: {
      type: String,
      default: "",
    },

    endDate: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("Report", reportSchema);
