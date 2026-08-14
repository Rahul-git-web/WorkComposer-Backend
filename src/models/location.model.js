import mongoose from "mongoose";

const locationSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    latitude: {
      type: Number,
      required: true,
    },

    longitude: {
      type: Number,
      required: true,
    },

    accuracy: {
      type: Number,
      default: null,
    },

    country: {
      type: String,
      default: "",
    },

    state: {
      type: String,
      default: "",
    },

    city: {
      type: String,
      default: "",
    },

    postalCode: {
      type: String,
      default: "",
    },

    address: {
      type: String,
      default: "",
    },

    ipAddress: {
      type: String,
      default: "",
    },

    serviceProvider: {
      type: String,
      default: "",
    },

    trackedAt: {
      type: Date,
      default: Date.now,
    },
  },

  {
    timestamps: true,
  },
);

locationSchema.index({
  organization: 1,
  user: 1,
});

locationSchema.index({
  organization: 1,
  trackedAt: -1,
});

export default mongoose.model("Location", locationSchema);
