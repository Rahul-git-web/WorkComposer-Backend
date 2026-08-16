import mongoose from "mongoose";

const timeTrackingSettingsSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      unique: true,
    },

    tracking: {
      trackingMode: {
        type: String,
        enum: ["automatic", "manual", "silent"],
        default: "automatic",
      },

      startTrackingOnBoot: {
        type: Boolean,
        default: true,
      },

      allowWorkAwayFromComputer: {
        type: Boolean,
        default: false,
      },

      pauseTrackingWhenInactive: {
        type: Boolean,
        default: true,
      },

      inactivityMinutes: {
        type: Number,
        default: 3,
      },

      continueTrackingDuringSleep: {
        type: Boolean,
        default: true,
      },

      sleepBreakHours: {
        type: Number,
        default: 4,
      },

      sleepBreakMinutes: {
        type: Number,
        default: 0,
      },

      displayBackToWorkReminder: {
        type: Boolean,
        default: true,
      },

      stopTrackingWithoutInternet: {
        type: Boolean,
        default: false,
      },

      statusBarVisibility: {
        type: String,
        enum: ["always", "during_tracking", "hidden"],
        default: "during_tracking",
      },

      applicationTracking: {
        type: Boolean,
        default: true,
      },

      ipTracking: {
        type: Boolean,
        default: true,
      },
    },

    screenCapture: {
      enabled: {
        type: Boolean,
        default: true,
      },

      randomizeFrequency: {
        type: Boolean,
        default: false,
      },

      screenshotFrequency: {
        type: Number,
        default: 5,
      },

      blurScreenshots: {
        type: String,
        enum: ["disabled", "slightly_blurred", "maximum_blurring"],
        default: "disabled",
      },
    },

    manualTime: {
      allowManualTime: {
        type: Boolean,
        default: true,
      },

      requireApproval: {
        type: Boolean,
        default: true,
      },

      managerApproval: {
        type: Boolean,
        default: true,
      },

      backdatingLimit: {
        type: Number,
        default: 365,
      },

      requireProjectTask: {
        type: Boolean,
        default: false,
      },
    },

    productivity: {},

    shift: {
      enabled: {
        type: Boolean,
        default: false,
      },

      autoStartTracking: {
        type: Boolean,
        default: false,
      },

      autoStopTracking: {
        type: Boolean,
        default: false,
      },

      stopTrackingDuringBreaks: {
        type: Boolean,
        default: false,
      },

      schedule: [
        {
          day: {
            type: String,
            required: true,
          },

          enabled: {
            type: Boolean,
            default: true,
          },

          startTime: {
            type: String,
            default: "09:00",
          },

          endTime: {
            type: String,
            default: "18:00",
          },

          breaks: [
            {
              name: {
                type: String,
                default: "",
              },

              startTime: {
                type: String,
                default: "",
              },

              endTime: {
                type: String,
                default: "",
              },
            },
          ],
        },
      ],
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model(
  "TimeTrackingSettings",
  timeTrackingSettingsSchema,
);
