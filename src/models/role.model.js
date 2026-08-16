import mongoose from "mongoose";

const roleSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    permissions: [
      {
        type: String,
      },
    ],

    reportAccess: {
      type: String,
      enum: ["none", "own", "managed", "all"],
      default: "none",
    },

    screenshotAccess: {
      type: String,
      enum: ["none", "own", "managed", "all"],
      default: "none",
    },

    isSystem: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("Role", roleSchema);
