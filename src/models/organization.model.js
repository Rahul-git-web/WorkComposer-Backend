import mongoose from "mongoose";

const organizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    logo: {
      type: String,
      default: "",
    },

    timezone: {
      type: String,
      default: "Asia/Kolkata",
    },

    twoFactor: {
      owner: {
        type: Boolean,
        default: false,
      },

      admin: {
        type: Boolean,
        default: false,
      },

      manager: {
        type: Boolean,
        default: false,
      },

      user: {
        type: Boolean,
        default: false,
      },
    },

    appUpdates: {
      automaticUpdates: {
        type: Boolean,
        default: true,
      },

      forceUpdates: {
        type: Boolean,
        default: false,
      },

      desktopReleaseEmails: {
        type: Boolean,
        default: false,
      },
    },

    emailReports: {
      // Tracking reports
      weeklyTrackingReports: {
        type: Boolean,
        default: false,
      },

      dailyTrackingReports: {
        type: Boolean,
        default: false,
      },

      // Daily warning emails
      dailyWarningEmails: {
        type: Boolean,
        default: false,
      },

      dailyBasedOnShift: {
        type: Boolean,
        default: true,
      },

      dailyMinimumTime: {
        hours: {
          type: Number,
          default: 4,
        },

        minutes: {
          type: Number,
          default: 0,
        },
      },

      dailyWeekDays: {
        type: [Number],
        default: [1, 2, 3, 4, 5], // Mon-Fri
      },

      // Weekly warning emails
      weeklyWarningEmails: {
        type: Boolean,
        default: false,
      },

      weeklyBasedOnShift: {
        type: Boolean,
        default: true,
      },

      weeklyMinimumTime: {
        hours: {
          type: Number,
          default: 4,
        },

        minutes: {
          type: Number,
          default: 0,
        },
      },

      // Idle percentage
      idlePercentageEnabled: {
        type: Boolean,
        default: false,
      },

      idlePercentage: {
        type: Number,
        default: 30,
      },
    },

    taskManagement: {
      notifyTaskAssignedEmail: {
        type: Boolean,
        default: true,
      },
    },
  },
  {
    timestamps: true,
  },
);

const Organization = mongoose.model("Organization", organizationSchema);

export default Organization;
