import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    organization: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ["owner", "manager", "admin", "user"],
      default: "user",
    },

    workSpaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
    },

    team: {
      type: String,
      default: "Default team",
    },

    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: undefined,
    },

    devices: [
      {
        ip: String,
        location: String,
        platform: String,
        appVersion: String,
        loginTime: {
          type: Date,
          default: Date.now,
        },
        lastSync: {
          type: Date,
          default: Date.now,
        },
        isOnline: {
          type: Boolean,
          default: false,
        },
      },
    ],

    password: {
      type: String,
      required: true,
      minlength: 8,
    },

    refreshToken: {
      type: String,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    isArchived: {
      type: Boolean,
      default: false,
    },

    verificationToken: String,
    verificationTokenExpire: Date,

    resetToken: {
      type: String,
    },

    resetTokenExpire: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

const User = mongoose.model("User", userSchema);

export default User;
