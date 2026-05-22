import mongoose from "mongoose";

const inviteSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: ["owner", "admin", "manager", "user"],
      required: true,
    },

   team: {
       type: String,
       default: "Default team"
    },
    token: {
      type: String,
      required: true,
    },
    expireAt: {
      type: Date,
      required: true,
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    organization: {
      type: String,
      required: true,
    },

    isAccepted: {
      type: Boolean,
      Default: false,
    },
    token: {
      type: String,
      required: true,
      index: true,
    },
  },
  { timestamps: true },
);

export default mongoose.model("Invite", inviteSchema);
