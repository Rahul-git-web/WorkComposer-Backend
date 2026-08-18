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

    twoFactorCode: {
      type: String,
    },

    twoFactorExpires: {
      type: Date,
    },

    jiraAccountId: {
      type: String,
    },

    asanaAccountId: {
      type: String,
    },

    bambooHREmployeeId: {
      type: String,
    },

    slackUserId: {
      type: String,
    },

    avatar: {
      type: String,
      default: "",
    },

    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    role: {
      type: String,
      enum: ["owner", "manager", "admin", "user"],
      default: "user",
    },

    roleRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      default: null,
    },

    appUpdateSettings: {
      automaticUpdates: {
        type: Boolean,
        default: null,
      },

      forceUpdates: {
        type: Boolean,
        default: null,
      },
    },

    trackingSettings: {
      trackingMode: {
        type: String,
        default: null,
      },

      startTrackingOnBoot: {
        type: Boolean,
        default: null,
      },

      allowWorkAwayFromComputer: {
        type: Boolean,
        default: null,
      },

      pauseTrackingWhenInactive: {
        type: Boolean,
        default: null,
      },

      inactivityMinutes: {
        type: Number,
        default: null,
      },

      continueTrackingDuringSleep: {
        type: Boolean,
        default: null,
      },

      sleepBreakHours: {
        type: Number,
        default: null,
      },

      sleepBreakMinutes: {
        type: Number,
        default: null,
      },

      displayBackToWorkReminder: {
        type: Boolean,
        default: null,
      },

      stopTrackingWithoutInternet: {
        type: Boolean,
        default: null,
      },

      statusBarVisibility: {
        type: String,
        default: null,
      },

      applicationTracking: {
        type: Boolean,
        default: null,
      },

      ipTracking: {
        type: Boolean,
        default: null,
      },
    },

    screenCaptureSettings: {
      enabled: {
        type: Boolean,
        default: null,
      },

      screenshotFrequency: {
        type: Number,
        default: null,
      },

      blurScreenshots: {
        type: String,
        enum: ["disabled", "slightly_blurred", "maximum_blurring"],
        default: null,
      },
    },

    manualTimeSettings: {
      allowManualTime: {
        type: Boolean,
        default: null,
      },

      requireApproval: {
        type: Boolean,
        default: null,
      },

      managerApproval: {
        type: Boolean,
        default: null,
      },

      backdatingLimit: {
        type: Number,
        default: null,
      },

      requireProjectTask: {
        type: Boolean,
        default: null,
      },
    },

    shiftSettings: {
      autoStartTracking: {
        type: Boolean,
        default: null,
      },
      autoStopTracking: {
        type: Boolean,
        default: null,
      },
      schedule: {
        type: Array,
        default: null,
      },
    },

    emailReportSettings: {
      // Tracking reports
      weeklyTrackingReports: {
        type: Boolean,
        default: null,
      },

      dailyTrackingReports: {
        type: Boolean,
        default: null,
      },

      // Daily warning emails
      dailyWarningEmails: {
        type: Boolean,
        default: null,
      },

      dailyBasedOnShift: {
        type: Boolean,
        default: null,
      },

      dailyMinimumTime: {
        hours: {
          type: Number,
          default: null,
        },
        minutes: {
          type: Number,
          default: null,
        },
      },

      dailyWeekDays: {
        type: [Number],
        default: null,
      },

      // Weekly warning emails
      weeklyWarningEmails: {
        type: Boolean,
        default: null,
      },

      weeklyBasedOnShift: {
        type: Boolean,
        default: null,
      },

      weeklyMinimumTime: {
        hours: {
          type: Number,
          default: null,
        },
        minutes: {
          type: Number,
          default: null,
        },
      },

      // Idle percentage
      idlePercentageEnabled: {
        type: Boolean,
        default: null,
      },

      idlePercentage: {
        type: Number,
        default: null,
      },
    },

    lastDailyWarningEmail: {
      type: Date,
    },

    lastWeeklyWarningEmail: {
      type: Date,
    },

    workSpaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
    },

    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      default: null,
    },

    weeklyReport: {
      type: Boolean,
      default: true,
    },

    dailyReport: {
      type: Boolean,
      default: false,
    },

    reportTeam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      default: null,
    },

    reportTimezone: {
      type: String,
      default: "Browser timezone",
    },

    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: undefined,
    },

    devices: [
      {
        deviceId: {
          type: String,
          required: true,
        },

        ip: String,
        location: String,
        platform: String,
        appVersion: String,
        hostname: String,

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

        isTracking: {
          type: Boolean,
          default: false,
        },
      },
    ],

    breakStartTime: {
      type: Date,
      default: null,
    },

    password: {
      type: String,
      required: function () {
        return !this.googleId && !this.microsoftId && !this.appleId;
      },
      minlength: 8,
    },

    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },

    microsoftId: {
      type: String,
      unique: true,
      sparse: true,
    },

    appleId: {
      type: String,
      unique: true,
      sparse: true,
    },

    authProvider: {
      type: String,
      enum: ["local", "google", "microsoft", "apple"],
      default: "local",
    },

    refreshTokens: [
      {
        token: String,
        deviceId: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],

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
