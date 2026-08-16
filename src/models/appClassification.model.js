import mongoose from "mongoose";

const appClassificationSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },

    appName: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    productivity: {
      type: String,
      enum: ["productive", "neutral", "unproductive", "blacklisted"],
      default: "neutral",
    },

    preventBreakMode: {
      type: Boolean,
      default: false,
    },

    disableIdleCalculation: {
      type: Boolean,
      default: false,
    },

    excludedTeams: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Team",
      },
    ],

    excludedUsers: [
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

// Prevent duplicate classifications for the same organization
appClassificationSchema.index(
  {
    organization: 1,
    appName: 1,
  },
  {
    unique: true,
  },
);

export default mongoose.model("AppClassification", appClassificationSchema);
