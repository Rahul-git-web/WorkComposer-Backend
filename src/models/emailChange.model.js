import mongoose from "mongoose";

const emailChangeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    newEmail: {
      type: String,
      required: true,
    },

    token: {
      type: String,
      required: true,
    },

    expireAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("EmailChange", emailChangeSchema);
